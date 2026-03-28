---
phase: 03-admin-master-panel
plan: 02
subsystem: ui
tags: [react, supabase-rpc, crud, admin-panel, color-picker, file-upload, impersonation]

requires:
  - phase: 03-admin-master-panel
    provides: AdminLayout shell, admin types, useAdminClient hook, authStore impersonation state, nested /admin routes
  - phase: 02-auth-security-hardening
    provides: authStore with role/isAdmin, ProtectedRoute, admin RPC pattern, RLS policies
provides:
  - 5 SECURITY DEFINER RPCs for expert CRUD (list, get, create, update, toggle)
  - useAdminExperts hook with full CRUD + logo upload
  - AdminExperts list page with table, impersonation, suspend/reactivate
  - AdminExpertForm create/edit page with color picker, logo upload, plan select, credentials, instances, voice_id
  - expert-logos Supabase Storage bucket with public read policy
affects: [03-03-PLAN]

tech-stack:
  added: []
  patterns: [admin-expert-rpc-pattern, color-palette-picker, supabase-storage-upload]

key-files:
  created:
    - src/hooks/useAdminExperts.ts
    - src/pages/admin/AdminExperts.tsx
    - src/pages/admin/AdminExpertForm.tsx
    - supabase/migrations/20260328_03_02_admin_expert_rpcs.sql
  modified:
    - src/App.tsx

key-decisions:
  - "admin_get_expert uses jsonb_build_object for instances to avoid leaking UAZAPI tokens"
  - "Case-insensitive email uniqueness check in admin_create_expert"
  - "ExpertInstance interface as safe subset of WhatsappRotacaoRow (no token fields)"
  - "Color picker: 10-color curated palette + custom hex input with live preview"
  - "Logo upload to expert-logos public bucket with random filename"

patterns-established:
  - "Admin CRUD pages in src/pages/admin/ directory"
  - "Color palette picker component pattern (curated palette + hex input)"
  - "Supabase Storage upload pattern via hook"

requirements-completed: [ADMN-02, ADMN-03, ADMN-04, ADMN-05, ADMN-10, ADMN-11]

duration: 6min
completed: 2026-03-28
---

# Phase 3 Plan 2: Expert CRUD System Summary

**Expert CRUD with 5 admin RPCs, list table with impersonation/suspend, create/edit form with color palette picker, logo upload, plan select, credentials, and voice_id input**

## Performance

- **Duration:** 6 min
- **Started:** 2026-03-28T00:29:12Z
- **Completed:** 2026-03-28T00:35:21Z
- **Tasks:** 2
- **Files modified:** 5

## Accomplishments
- 5 SECURITY DEFINER RPCs: admin_list_experts (with plan join + lead/instance counts), admin_get_expert (jsonb_build_object for safe instance data), admin_create_expert (expert + admin_users atomically), admin_update_expert, admin_toggle_expert (cascades to admin_users)
- Expert list page with colored dots, status badges, 3 action buttons (edit, impersonate via startImpersonation, suspend/reactivate toggle)
- Expert create/edit form with 7 sections: basic data, color palette picker (10 colors + hex), logo drag-and-drop upload, plan selector with limit details, credentials, UAZAPI instances display, voice_id input
- expert-logos Supabase Storage bucket with public read, upload, update, delete policies

## Task Commits

Each task was committed atomically:

1. **Task 1: Admin expert RPCs and useAdminExperts hook** - `2ad3308` (feat)
2. **Task 2: Expert list page and create/edit form pages** - `ae045bb` (feat)

## Files Created/Modified
- `supabase/migrations/20260328_03_02_admin_expert_rpcs.sql` - 5 admin expert RPCs (list, get, create, update, toggle)
- `src/hooks/useAdminExperts.ts` - Hook with full expert CRUD + logo upload to Supabase Storage
- `src/pages/admin/AdminExperts.tsx` - Expert list page with table, impersonation, suspend/reactivate
- `src/pages/admin/AdminExpertForm.tsx` - Expert create/edit form with all 7 sections
- `src/App.tsx` - Updated admin routes from placeholders to actual page components

## Decisions Made
- admin_get_expert uses jsonb_build_object for instances (not row_to_json) to avoid leaking UAZAPI tokens to frontend
- Case-insensitive email uniqueness in admin_create_expert using lower()
- Created ExpertInstance interface as safe subset of WhatsappRotacaoRow (id, nome, numero, instancia, ativo only)
- Color picker uses 10-color curated palette with custom hex input and live preview circle
- Logo upload uses random filename with timestamp to avoid collisions
- Planos loaded via direct supabase query in create mode, via getExpertDetail in edit mode

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 2 - Missing Critical] Case-insensitive email uniqueness check**
- **Found during:** Task 1 (admin_create_expert RPC)
- **Issue:** Plan used exact match for email uniqueness; could allow duplicate emails with different casing
- **Fix:** Used `lower(email) = lower(p_email)` and store email as lowercase
- **Files modified:** supabase/migrations/20260328_03_02_admin_expert_rpcs.sql
- **Committed in:** 2ad3308

**2. [Rule 1 - Bug] COALESCE for empty jsonb_agg results**
- **Found during:** Task 1 (admin_list_experts RPC)
- **Issue:** jsonb_agg returns NULL when no rows exist; would crash frontend expecting array
- **Fix:** Wrapped with COALESCE(..., '[]'::jsonb) in admin_list_experts and admin_get_expert
- **Files modified:** supabase/migrations/20260328_03_02_admin_expert_rpcs.sql
- **Committed in:** 2ad3308

---

**Total deviations:** 2 auto-fixed (1 missing critical, 1 bug)
**Impact on plan:** Both fixes essential for correctness and security. No scope creep.

## Issues Encountered
None

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Expert CRUD fully operational for Plan 03 (Dashboard Global + Planos management)
- All admin routes wired except Dashboard Global and Planos (still placeholder)
- useAdminExperts hook ready for consumption by other admin pages
- Impersonation flow working end-to-end (list -> startImpersonation -> /dashboard)

## Known Stubs
None - all data sources are wired to live Supabase RPCs.

## Self-Check: PASSED

All 4 created files verified on disk. Both commit hashes (2ad3308, ae045bb) found in git log.

---
*Phase: 03-admin-master-panel*
*Completed: 2026-03-28*
