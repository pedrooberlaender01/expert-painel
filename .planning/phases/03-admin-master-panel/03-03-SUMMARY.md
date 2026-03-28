---
phase: 03-admin-master-panel
plan: 03
subsystem: ui
tags: [react, supabase-rpc, admin-panel, dashboard, metrics, plan-management, inline-editing]

requires:
  - phase: 03-admin-master-panel
    provides: AdminLayout shell, admin types, useAdminClient hook, nested /admin routes
  - phase: 02-auth-security-hardening
    provides: authStore with role/isAdmin, ProtectedRoute, admin RPC pattern, RLS policies
provides:
  - Admin dashboard page with 4 metric cards and sortable expert breakdown table
  - Plan management page with inline-editable table and CRUD operations
  - 4 SECURITY DEFINER RPCs (admin_dashboard_metrics, admin_list_planos, admin_update_plano, admin_create_plano)
  - useAdminDashboard and useAdminPlanos hooks
  - Default plan values updated (Basico 500/2/1000, Pro 2000/5/5000, Enterprise null/10/null)
affects: []

tech-stack:
  added: []
  patterns: [admin-dashboard-metrics-rpc, plan-crud-rpc, inline-table-editing]

key-files:
  created:
    - src/hooks/useAdminDashboard.ts
    - src/hooks/useAdminPlanos.ts
    - src/pages/admin/AdminDashboard.tsx
    - src/pages/admin/AdminPlanos.tsx
    - supabase/migrations/20260328_03_03_admin_dashboard_planos_rpcs.sql
  modified:
    - src/App.tsx

key-decisions:
  - "Dashboard metrics use mensagens table (direcao='enviada') for envios count, NOT envios_massa"
  - "Expert breakdown table sortable by all 6 columns with toggle asc/desc"
  - "Plan features edited via multi-select toggle buttons for known features list"
  - "NULL plan limits display as 'Ilimitado' in green text"
  - "features_permitidas is TEXT[] (no JSONB cast needed)"
  - "Inline editing pattern: editingId state toggles row between display/edit mode"

patterns-established:
  - "Admin dashboard metrics via single RPC returning metrics + breakdown in one call"
  - "Inline table editing with edit/new row state management"

requirements-completed: [ADMN-06, ADMN-07, ADMN-08, PLAN-01, PLAN-02, PLAN-03, PLAN-08]

duration: 4min
completed: 2026-03-28
---

# Phase 3 Plan 3: Admin Dashboard & Plan Management Summary

**Admin dashboard with 4 metric cards (leads, envios, experts, instancias) + sortable expert breakdown table, and plan management page with inline-editable table for CRUD operations on plans**

## Performance

- **Duration:** 4 min
- **Started:** 2026-03-28T00:38:01Z
- **Completed:** 2026-03-28T00:42:31Z
- **Tasks:** 2
- **Files modified:** 6

## Accomplishments
- Admin dashboard page with 4 MetricCards showing Total Leads, Envios do Mes, Experts Ativos/Total, Instancias Conectadas
- Sortable expert breakdown table with 6 columns (name, leads, envios, instancias, plano, status) and toggle asc/desc sorting
- admin_dashboard_metrics RPC aggregating data from leads, mensagens, experts, whatsapp_rotacao, planos tables
- Plan management page with editable table showing all plans with inline edit and create capabilities
- Features multi-select via toggle buttons for 5 known features (agendamento, torneio, copy_ia, moderacao, voz_clonada)
- NULL limits display as "Ilimitado" in green text
- 4 SECURITY DEFINER RPCs for dashboard and plan CRUD
- Default plan values ensured: Basico (500/2/1000), Pro (2000/5/5000), Enterprise (null/10/null)

## Task Commits

Each task was committed atomically:

1. **Task 1: Admin dashboard RPCs, hook, and page** - `7c31606` (feat)
2. **Task 2: Plan management RPCs, hook, and editable table page** - `f0bbc54` (feat)

## Files Created/Modified
- `src/hooks/useAdminDashboard.ts` - Hook consuming admin_dashboard_metrics RPC
- `src/hooks/useAdminPlanos.ts` - Hook with list, update, create operations for plans
- `src/pages/admin/AdminDashboard.tsx` - Dashboard page with 4 MetricCards + sortable expert breakdown table
- `src/pages/admin/AdminPlanos.tsx` - Plan management page with inline-editable table
- `supabase/migrations/20260328_03_03_admin_dashboard_planos_rpcs.sql` - 4 RPCs + default plan value updates
- `src/App.tsx` - Replaced placeholder routes with AdminDashboard and AdminPlanos components

## Decisions Made
- Dashboard metrics use mensagens table (direcao='enviada') for envios count, not envios_massa table
- Expert breakdown table sortable by all 6 columns with click-to-toggle direction
- Plan features edited via multi-select toggle buttons (not free-text input)
- NULL limits displayed as "Ilimitado" in green for clear visual distinction
- features_permitidas is TEXT[] so no JSONB cast needed in RPCs
- Inline editing pattern chosen over modal (per D-17 discretion)

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None

## User Setup Required
- Migration SQL at `supabase/migrations/20260328_03_03_admin_dashboard_planos_rpcs.sql` must be applied to Supabase if not already done via MCP

## Known Stubs
None - all data sources are wired to live Supabase RPCs.

## Self-Check: PASSED

All 5 created files verified on disk. Both commit hashes (7c31606, f0bbc54) found in git log.
