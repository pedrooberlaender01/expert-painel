---
phase: 02-auth-security-hardening
plan: 01
subsystem: auth
tags: [authentication, roles, rbac, supabase-rpc, zustand, multi-tenant]

# Dependency graph
requires: []
provides:
  - "admin_users.role column (admin|expert)"
  - "admin_users.expert_id FK to experts"
  - "set_expert_context() RLS helper"
  - "admin_login RPC returns expanded user with role, expert_id, expert profile + plano"
  - "get_leads_for_expert() example RPC pattern"
  - "User type with role, expert_id, ExpertProfile"
  - "authStore.isAdmin() and authStore.getExpertId() helpers"
  - "ProtectedRoute requiredRole prop for role-based gating"
  - "/admin route protected by requiredRole=admin"
affects: [02-02-rls-policies, 02-03-security-hardening, 03-frontend-multi-tenant]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Role-based access control via admin_users.role column"
    - "Expert context propagation via set_config('app.expert_id') for RLS"
    - "Expanded RPC return with nested expert profile and plan data"
    - "ProtectedRoute requiredRole prop for route-level RBAC"

key-files:
  created:
    - "supabase/migrations/20260327_02_01_auth_roles.sql"
  modified:
    - "src/stores/authStore.ts"
    - "src/types/index.ts"
    - "src/types/database.ts"
    - "src/components/ProtectedRoute.tsx"
    - "src/pages/Login.tsx"
    - "src/App.tsx"

key-decisions:
  - "Existing users (Pedro, Thiago, Lindomar) set to role=admin since they are agency team"
  - "Created allan@admin.com and allan@expert.com test accounts reusing existing password hash"
  - "admin_login returns JSONB (not JSON) for consistency with jsonb_build_object"
  - "ProtectedRoute allows both admin and expert on non-admin routes (no requiredRole needed)"

patterns-established:
  - "set_expert_context(uuid) before any expert-scoped query for RLS"
  - "admin_login RPC as single auth entry point returning full session data"
  - "requiredRole prop pattern on ProtectedRoute for RBAC"

requirements-completed: [AUTH-01, AUTH-02, AUTH-03, AUTH-04, AUTH-05, AUTH-06, AUTH-07]

# Metrics
duration: 5min
completed: 2026-03-27
---

# Phase 02 Plan 01: Auth Roles & Session Extension Summary

**Role-based auth with admin/expert distinction, expert_id bound to sessions via updated admin_login RPC returning full expert profile with plan data**

## Performance

- **Duration:** 5 min
- **Started:** 2026-03-27T22:32:41Z
- **Completed:** 2026-03-27T22:37:52Z
- **Tasks:** 2
- **Files modified:** 7

## Accomplishments

- Added `role` (TEXT NOT NULL DEFAULT 'expert') and `expert_id` (UUID FK experts) columns to admin_users
- Created `set_expert_context()` helper that sets `app.expert_id` config for RLS policies
- Rewrote `admin_login` RPC to return expanded user: id, email, nome, role, expert_id, and full expert profile (colors, logo, platform name, assistant name) with nested plan limits
- Created `get_leads_for_expert()` as example RPC pattern for gradual hook migration
- Extended User type with role, expert_id, and ExpertProfile interface
- authStore now imports User from types, exposes `isAdmin()` and `getExpertId()` helpers
- ProtectedRoute accepts optional `requiredRole` prop for route-level RBAC
- Login.tsx redirects admin users to /admin, expert users to /dashboard
- App.tsx has /admin route wrapped with `requiredRole="admin"` protection
- AdminUserRow type added to database.ts

## Task Commits

1. **Task 1: Database migration** - `188c920` (feat)
2. **Task 2: Frontend auth extension** - `f88ff5b` (feat)

**Plan metadata:** (pending final commit)

## Files Created/Modified

- `supabase/migrations/20260327_02_01_auth_roles.sql` - Full DDL: ALTER admin_users, set_expert_context, admin_login, get_leads_for_expert
- `src/types/index.ts` - ExpertProfile interface + expanded User type with role/expert_id/expert
- `src/types/database.ts` - AdminUserRow type
- `src/stores/authStore.ts` - Import User from types, isAdmin(), getExpertId() helpers
- `src/components/ProtectedRoute.tsx` - requiredRole prop for role-based route gating
- `src/pages/Login.tsx` - Role-based redirect (admin to /admin, expert to /)
- `src/App.tsx` - /admin route with requiredRole="admin" protection

## Decisions Made

- Existing dashboard users (Pedro, Thiago, Lindomar) were set to role='admin' since they are the agency team who manage the platform. This preserves their current access level.
- Created `allan@admin.com` (role=admin) and `allan@expert.com` (role=expert, linked to Allan Cabral expert) as test accounts reusing an existing password hash.
- admin_login RPC was changed to return JSONB instead of JSON for consistency with jsonb_build_object usage.
- Non-admin routes do NOT require requiredRole -- both admin and expert can access expert dashboard pages.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] No allan@admin.com user existed in admin_users**
- **Found during:** Task 1
- **Issue:** Plan assumed allan@admin.com existed but actual users were Pedro, Thiago, Lindomar with no allan@ accounts
- **Fix:** Created allan@admin.com and allan@expert.com accounts using existing password hash. Set existing users to role=admin.
- **Files modified:** supabase/migrations/20260327_02_01_auth_roles.sql (documentation updated)
- **Commit:** 188c920

---

**Total deviations:** 1 auto-fixed (1 blocking)
**Impact on plan:** Minor adaptation. Same functionality achieved with correct user data.

## Known Stubs

- `/admin` route renders placeholder text "Admin Panel -- Em construcao (Phase 3)" -- intentional, Phase 3 will build the actual admin panel.

## Issues Encountered

- JSON escaping issues when sending complex PL/pgSQL via curl. Resolved by writing SQL to file and using Node.js for proper JSON serialization.

## Next Phase Readiness

- Role-based auth is fully operational -- ready for RLS policies (Plan 02) that use `current_setting('app.expert_id')` pattern
- `set_expert_context()` helper exists for RPCs to call before queries
- `get_leads_for_expert()` serves as migration pattern for hooks

---
*Phase: 02-auth-security-hardening*
*Completed: 2026-03-27*
