---
phase: 04-white-label-plan-enforcement
plan: 01
subsystem: ui
tags: [css-variables, tailwind, white-label, theming, dynamic-colors]

# Dependency graph
requires:
  - phase: 03-admin-panel
    provides: "Admin impersonation, expert profile with cor_primaria/cor_secundaria in authStore"
provides:
  - "CSS Variables infrastructure (--color-primary, --color-primary-hover, --color-primary-bg, --color-primary-light)"
  - "Tailwind primary color class (bg-primary, text-primary-light, border-primary-bg, etc.)"
  - "Dynamic color application on expert login and admin impersonation"
  - "Complete emerald-to-primary migration across 40+ files"
affects: [04-02-sidebar-dynamic-content, 04-03-plan-enforcement, 05-whatsapp-n8n]

# Tech tracking
tech-stack:
  added: []
  patterns: [css-variables-theming, dynamic-brand-colors-via-useEffect]

key-files:
  created: []
  modified:
    - tailwind.config.js
    - src/index.css
    - src/App.tsx
    - src/components/MetricCard.tsx
    - src/components/LeadBadge.tsx
    - src/utils/formatters.ts
    - src/pages/Dashboard.tsx
    - src/pages/Leads.tsx
    - src/pages/Conversas.tsx
    - src/pages/Mensagens.tsx
    - src/pages/Torneios.tsx
    - src/pages/Grupos.tsx
    - src/pages/SimuladorEnvios.tsx
    - src/pages/CentralWhatsapp.tsx
    - src/pages/Funil.tsx
    - src/pages/Notificacoes.tsx
    - src/pages/Numeros.tsx
    - src/components/mensagens/FollowupCard.tsx
    - src/components/mensagens/MensagemCard.tsx
    - src/components/mensagens/MensagensAbertura.tsx
    - src/components/mensagens/GatilhoCard.tsx
    - src/components/copy/ExpertPerfilSidebar.tsx
    - src/components/copy/BaseConhecimento.tsx
    - src/components/envios/TipoEnvioSelector.tsx
    - src/components/envios/FiltroStatus.tsx
    - src/components/agendamentos/AgendamentoCard.tsx
    - src/components/agendamentos/AgendamentoDatePicker.tsx
    - src/components/agendamentos/AgendamentoDetalhesModal.tsx
    - src/components/agendamentos/AudioPlayer.tsx
    - src/components/agendamentos/CanalSelector.tsx
    - src/components/agendamentos/GrupoSelector.tsx
    - src/components/agendamentos/MensagemBiblioteca.tsx
    - src/components/agendamentos/NovaMensagemModal.tsx
    - src/components/numeros/InstanciaCard.tsx
    - src/components/numeros/ColetaInstanciaCard.tsx
    - src/components/numeros/NumeroCard.tsx
    - src/components/numeros/MensagemAberturaCard.tsx
    - src/components/numeros/NovaInstanciaModal.tsx

key-decisions:
  - "CSS variables defined in :root with emerald defaults, overwritten on login via document.documentElement.setProperty"
  - "Tailwind primary color references CSS variables enabling bg-primary, text-primary-light, etc."
  - "App.tsx useEffect watches impersonatedExpert and user.expert for dynamic color switching"
  - "MetricCard color prop changed from 'emerald' to 'primary' with CSS variable-based colorMap"
  - "Hardcoded 'Allan Cabral' replaced with dynamic expert name from authStore"

patterns-established:
  - "CSS Variable theming: all brand colors use var(--color-primary*) instead of hardcoded hex values"
  - "Tailwind classes: bg-primary, text-primary-light, border-primary-bg, bg-primary-hover for themed elements"
  - "Inline styles for CSS variables: style={{ color: 'var(--color-primary-light)' }} when Tailwind classes insufficient"

requirements-completed: [WLBL-01, WLBL-02, WLBL-03, WLBL-07, WLBL-08]

# Metrics
duration: 21min
completed: 2026-03-28
---

# Phase 04 Plan 01: CSS Variables + Emerald-to-Primary Migration Summary

**CSS Variables theming infrastructure with dynamic expert color application and complete emerald-to-primary migration across 38 files**

## Performance

- **Duration:** 21 min
- **Started:** 2026-03-28T01:44:11Z
- **Completed:** 2026-03-28T02:05:53Z
- **Tasks:** 4
- **Files modified:** 38

## Accomplishments
- CSS Variables (:root with --color-primary, --color-primary-hover, --color-primary-bg, --color-primary-light) with emerald defaults
- Tailwind primary color configuration referencing CSS variables
- Dynamic color application in App.tsx ProtectedLayout watching expert/impersonation state
- Complete migration of all 38 expert-facing files from hardcoded emerald to primary CSS variable system
- Zero hardcoded emerald references remain in expert-facing code (verified via grep)
- TypeScript compiles and Vite build succeeds

## Task Commits

Each task was committed atomically:

1. **Task 1: CSS Variables infrastructure + Tailwind config + App.tsx dynamic application** - `d2f4c4e` (feat)
2. **Task 2: Migrate shared components and pages (13 files)** - `1236292` (feat)
3. **Task 3: Migrate feature subdirectory components (10 files)** - `d469a8c` (feat)
4. **Task 4: Migrate agendamentos and numeros subdirectory components (13 files)** - `7c4d8aa` (feat)

## Files Created/Modified
- `tailwind.config.js` - Added primary color using CSS variables
- `src/index.css` - Added :root CSS variables with defaults, updated ambient-light and mesh-bg
- `src/App.tsx` - Added useEffect for dynamic color application, replaced hardcoded name
- `src/components/MetricCard.tsx` - Color prop changed from 'emerald' to 'primary'
- `src/components/LeadBadge.tsx` - Status colors use primary-bg/primary-light
- `src/utils/formatters.ts` - getStatusColor uses primary classes
- 13 pages (Dashboard, Leads, Conversas, etc.) - All emerald references replaced
- 9 mensagens/copy/envios components - All emerald inline styles replaced
- 13 agendamentos/numeros components - All emerald classes and styles replaced

## Decisions Made
- CSS variable defaults are emerald (#10b981) to match current branding for Allan (Expert #1)
- App.tsx cleanup function resets to defaults on unmount (important for signOut)
- MetricCard retains 'primary' as default color prop (was 'emerald')
- Used CSS variable references in inline styles where Tailwind arbitrary values couldn't support CSS vars
- Admin pages (src/pages/admin/*) intentionally NOT touched per plan scope

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None

## Known Stubs
None - all colors are wired to CSS variables that are dynamically set from expert profile data.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- CSS Variables infrastructure is in place for plans 02 (sidebar dynamic content) and 03 (plan enforcement)
- All expert-facing components now respond to --color-primary changes
- Admin impersonation color switching is functional via useEffect in ProtectedLayout

## Self-Check: PASSED

All key files exist. All 4 task commits verified in git log. Zero emerald references in expert-facing code (2 intentional defaults in App.tsx cleanup). TypeScript compiles. Vite builds.

---
*Phase: 04-white-label-plan-enforcement*
*Completed: 2026-03-28*
