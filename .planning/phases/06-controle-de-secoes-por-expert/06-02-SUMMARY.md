---
phase: 06-controle-de-secoes-por-expert
plan: 02
subsystem: ui
tags: [react, hooks, routing, section-gating, sidebar, route-guard]

requires:
  - phase: 06-controle-de-secoes-por-expert/01
    provides: "secoes_habilitadas column in experts table and ExpertProfile type"
provides:
  - "useSectionGate hook for checking section enabled/disabled"
  - "useSectionGates batch check for Sidebar"
  - "SectionGuard route wrapper with redirect"
  - "SECTION_PATH_MAP mapping all routes to section keys"
  - "Sidebar visual for disabled sections (grey + lock + tooltip)"
affects: [admin-expert-crud, feature-gating]

tech-stack:
  added: []
  patterns: [section-gating-before-feature-gating, SectionGuard-route-wrapper]

key-files:
  created: [src/hooks/useSectionGate.ts]
  modified: [src/components/Sidebar.tsx, src/App.tsx]

key-decisions:
  - "Section gating prioritized over feature/plan gating in sidebar render order"
  - "Section-disabled visual uses text-white/[0.15] (more muted than plan-gated text-white/[0.2])"
  - "SectionGuard uses React.createElement instead of JSX for clean hook file"

patterns-established:
  - "SectionGuard wrapper: wrap Route element to enforce section access"
  - "sectionKey on NavItem: explicit section mapping per nav item"
  - "Section gating check runs before feature gating in Sidebar map loop"

requirements-completed: [SEC-06, SEC-07, SEC-08, SEC-09]

duration: 2min
completed: 2026-04-01
---

# Phase 06 Plan 02: Frontend Section Gating Summary

**useSectionGate hook with Sidebar disabled-section visual (grey+lock+tooltip) and SectionGuard route redirect to /dashboard**

## Performance

- **Duration:** 2 min
- **Started:** 2026-04-01T15:18:14Z
- **Completed:** 2026-04-01T15:20:09Z
- **Tasks:** 2
- **Files modified:** 3

## Accomplishments
- Created useSectionGate hook with single/batch section checks and SectionGuard component
- Sidebar shows disabled sections with distinct grey+lock visual and "Secao indisponivel" tooltip
- All section routes wrapped with SectionGuard that silently redirects to /dashboard
- /notificacoes and /configuracoes remain always accessible (no gating)

## Task Commits

Each task was committed atomically:

1. **Task 1: Create useSectionGate hook and SectionGuard component** - `462e9e9` (feat)
2. **Task 2: Integrate section gating into Sidebar and App routes** - `7f6b05c` (feat)

## Files Created/Modified
- `src/hooks/useSectionGate.ts` - Hook com SectionKey type, SECTION_PATH_MAP, useSectionGate, useSectionGates, SectionGuard
- `src/components/Sidebar.tsx` - Gating de secao antes de gating de feature, visual cinza+cadeado para secoes desabilitadas
- `src/App.tsx` - Todas as rotas de secao envolvidas com SectionGuard, exceto /notificacoes e /configuracoes

## Decisions Made
- Section gating check placed before feature gating in Sidebar to ensure section-disabled priority (D-04/D-05)
- Section-disabled visual uses slightly more muted opacity (0.15/0.20) vs plan-gated (0.2/0.30) for visual distinction
- SectionGuard uses React.createElement to avoid JSX in a .ts hook file

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Phase 06 complete: database column (Plan 01) + frontend gating (Plan 02) fully implemented
- Admin can now control which sections each expert sees via secoes_habilitadas JSONB
- Ready for production use after admin UI integration for section toggle

---
*Phase: 06-controle-de-secoes-por-expert*
*Completed: 2026-04-01*
