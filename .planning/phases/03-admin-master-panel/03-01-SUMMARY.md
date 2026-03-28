---
phase: 03-admin-master-panel
plan: 01
subsystem: ui
tags: [react, zustand, admin-panel, impersonation, glassmorphism, routing]

requires:
  - phase: 02-auth-security
    provides: authStore with isAdmin/role, ProtectedRoute with requiredRole, admin RPC pattern
provides:
  - AdminSidebar component with Experts/Planos/Dashboard Global navigation
  - AdminLayout shell with sidebar, mobile menu, impersonation banner
  - ImpersonationBanner component with expert color and Sair button
  - Admin types (AdminExpertListItem, ExpertFormData, AdminDashboardMetrics, ExpertBreakdownRow)
  - useAdminClient hook for admin RPC calls
  - authStore impersonation state (startImpersonation, stopImpersonation, getActiveExpertId)
  - Nested /admin routes in App.tsx with placeholder pages
affects: [03-02-PLAN, 03-03-PLAN]

tech-stack:
  added: []
  patterns: [admin-layout-shell, impersonation-state-pattern, admin-rpc-hook]

key-files:
  created:
    - src/types/admin.ts
    - src/hooks/useAdminClient.ts
    - src/components/admin/AdminSidebar.tsx
    - src/components/admin/AdminLayout.tsx
    - src/components/admin/ImpersonationBanner.tsx
  modified:
    - src/stores/authStore.ts
    - src/App.tsx

key-decisions:
  - "authStore impersonation is session-only (not persisted to localStorage)"
  - "AdminSidebar uses blue accent (rgba(59,130,246)) to distinguish from expert sidebar"
  - "ImpersonationBanner uses expert cor_primaria as background for visual context"

patterns-established:
  - "Admin components in src/components/admin/ directory"
  - "useAdminClient hook wraps supabase.rpc() for all admin operations"
  - "Admin routes nested under /admin with AdminLayout as parent element"

requirements-completed: [ADMN-01, ADMN-09]

duration: 2min
completed: 2026-03-28
---

# Phase 3 Plan 1: Admin Panel Infrastructure Summary

**Admin panel shell with AdminSidebar (3 nav items), AdminLayout, ImpersonationBanner, admin types, useAdminClient RPC hook, and nested /admin routes**

## Performance

- **Duration:** 2 min
- **Started:** 2026-03-28T00:24:45Z
- **Completed:** 2026-03-28T00:27:06Z
- **Tasks:** 2
- **Files modified:** 7

## Accomplishments
- AdminSidebar with dark glassmorphism matching expert sidebar aesthetic, 3 nav items (Experts, Planos, Dashboard Global)
- AdminLayout shell with sidebar, mobile overlay menu, and ImpersonationBanner integration
- ImpersonationBanner with expert cor_primaria background color and Sair button that returns to /admin/experts
- authStore extended with impersonation state (session-only, not persisted)
- Admin types file with AdminExpertListItem, ExpertFormData, AdminDashboardMetrics, ExpertBreakdownRow
- useAdminClient hook providing typed RPC wrapper for all admin operations
- App.tsx updated with nested admin routes (index, experts, experts/new, experts/:id/edit, planos)

## Task Commits

Each task was committed atomically:

1. **Task 1: Admin types, authStore impersonation, and admin RPC client hook** - `7fb51f1` (feat)
2. **Task 2: AdminSidebar, AdminLayout, ImpersonationBanner, and App.tsx routing** - `4c0a8fd` (feat)

## Files Created/Modified
- `src/types/admin.ts` - Admin-specific type definitions (AdminExpertListItem, ExpertFormData, AdminDashboardMetrics, ExpertBreakdownRow)
- `src/hooks/useAdminClient.ts` - Hook wrapping supabase.rpc() for admin operations
- `src/stores/authStore.ts` - Extended with impersonation state and getActiveExpertId
- `src/components/admin/AdminSidebar.tsx` - Admin navigation sidebar with 3 items and collapse/mobile support
- `src/components/admin/AdminLayout.tsx` - Admin layout shell with sidebar + outlet + banner
- `src/components/admin/ImpersonationBanner.tsx` - Fixed top banner during impersonation with Sair button
- `src/App.tsx` - Updated with AdminLayout and nested admin routes

## Decisions Made
- authStore impersonation is session-only (not persisted to localStorage) per D-14
- AdminSidebar uses blue accent to distinguish from expert green theme
- ImpersonationBanner uses expert's cor_primaria as background per D-13
- Placeholder route elements will be replaced by actual page components in Plans 02 and 03

## Deviations from Plan

None - plan executed exactly as written. The authStore already had impersonation state from a prior iteration, which matched the plan spec exactly.

## Issues Encountered
None

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Admin layout shell ready for Plan 02 (Expert CRUD pages) and Plan 03 (Dashboard Global + Planos)
- All placeholder routes in place for page components to be wired in
- useAdminClient hook ready for admin data hooks to consume
- Impersonation infrastructure ready for "Ver como expert" feature

## Self-Check: PASSED

All 5 created files verified on disk. Both commit hashes (7fb51f1, 4c0a8fd) found in git log.

---
*Phase: 03-admin-master-panel*
*Completed: 2026-03-28*
