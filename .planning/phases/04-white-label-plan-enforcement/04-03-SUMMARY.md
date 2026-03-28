---
phase: 04-white-label-plan-enforcement
plan: 03
subsystem: ui
tags: [plan-limits, enforcement, banner, hooks, monetization-gate]

# Dependency graph
requires:
  - phase: 04-white-label-plan-enforcement
    plan: 01
    provides: "CSS Variables infrastructure, Tailwind primary color classes"
  - phase: 03-admin-panel
    provides: "Admin impersonation, expert profile with plano limits in authStore"
provides:
  - "usePlanLimits hook for leads, instancias, envios limit checking"
  - "PlanLimitBanner reusable inline banner component"
  - "Plan limit enforcement on Leads, CentralWhatsapp, SimuladorEnvios pages"
  - "Pre-send limit check in useEnvioMassa.iniciarEnvio"
affects: [05-whatsapp-n8n]

# Tech tracking
tech-stack:
  added: []
  patterns: [plan-limit-hook, inline-limit-banner, pre-action-limit-check]

key-files:
  created:
    - src/hooks/usePlanLimits.ts
    - src/components/PlanLimitBanner.tsx
  modified:
    - src/pages/Leads.tsx
    - src/pages/CentralWhatsapp.tsx
    - src/pages/SimuladorEnvios.tsx
    - src/hooks/useEnvioMassa.ts

key-decisions:
  - "No create-lead button exists in Leads.tsx (leads come from WhatsApp), so only banner is added"
  - "Both Nova Instancia Disparadora and Nova Instancia de Coleta buttons disabled when instancia limit hit"
  - "useEnvioMassa pre-check uses useAuthStore.getState() for non-hook access inside callback"
  - "PlanLimitBanner only renders at 80%+ usage to avoid clutter"

patterns-established:
  - "usePlanLimits(): centralized hook returning LimitStatus per resource type"
  - "PlanLimitBanner: reusable banner with warning (80%+) and error (100%) states"
  - "Pre-action limit check: useAuthStore.getState() for synchronous expert access in callbacks"

requirements-completed: [PLAN-04, PLAN-05, PLAN-06]

# Metrics
duration: 3min
completed: 2026-03-28
---

# Phase 04 Plan 03: Plan Limit Enforcement Summary

**usePlanLimits hook + PlanLimitBanner component enforcing max_leads, max_instancias, max_envios_mes with inline banners and disabled buttons across Leads, CentralWhatsapp, and SimuladorEnvios pages**

## Performance

- **Duration:** 3 min
- **Started:** 2026-03-28T02:12:29Z
- **Completed:** 2026-03-28T02:15:52Z
- **Tasks:** 2
- **Files created:** 2
- **Files modified:** 4

## Accomplishments
- usePlanLimits hook fetches current counts via Promise.allSettled for leads, active instances, and monthly sends
- PlanLimitBanner renders at 80%+ usage with yellow warning or red error state and progress bar
- Leads page shows lead limit banner below PageHeader
- CentralWhatsapp page shows instance limit banner and disables both "Nova Instancia" buttons at limit
- SimuladorEnvios page shows envio limit banner for user awareness
- useEnvioMassa.iniciarEnvio pre-checks monthly send limit before creating envio record
- All limits respect null as unlimited (Enterprise plan)
- Impersonation support: uses impersonatedExpert when present
- TypeScript compiles cleanly, Vite build succeeds

## Task Commits

Each task was committed atomically:

1. **Task 1: Create usePlanLimits hook and PlanLimitBanner component** - `798480e` (feat)
2. **Task 2: Integrate plan limits into Leads, CentralWhatsapp, SimuladorEnvios, useEnvioMassa** - `0cd2b8b` (feat)

## Files Created/Modified
- `src/hooks/usePlanLimits.ts` - Hook returning LimitStatus for leads, instancias, envios with parallel count queries
- `src/components/PlanLimitBanner.tsx` - Reusable banner showing usage at 80%+ with progress bar
- `src/pages/Leads.tsx` - Added usePlanLimits + PlanLimitBanner below PageHeader
- `src/pages/CentralWhatsapp.tsx` - Added banner + disabled Nova Instancia buttons at limit
- `src/pages/SimuladorEnvios.tsx` - Added envio limit banner between EnviosNav and simulator form
- `src/hooks/useEnvioMassa.ts` - Pre-send limit check at top of iniciarEnvio function

## Decisions Made
- Leads.tsx has no "create lead" button (leads arrive via WhatsApp automation), so only the banner is added for awareness
- Both "Nova Instancia Disparadora" and "Nova Instancia de Coleta" buttons are disabled when instance limit is reached
- useEnvioMassa uses useAuthStore.getState() (not hook form) since it runs inside a useCallback
- PlanLimitBanner renders nothing below 80% usage to keep UI clean

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None

## Known Stubs
None - all limits are wired to live Supabase count queries and expert profile plan data.

## User Setup Required
None

## Next Phase Readiness
- Plan limit enforcement complete for all three resource types
- Phase 04 fully complete (colors, sidebar, plan limits)
- Ready for Phase 05 (WhatsApp/N8N)

---
*Phase: 04-white-label-plan-enforcement*
*Completed: 2026-03-28*
