---
phase: 05-whatsapp-n8n-workflows-voice
plan: 01
subsystem: ui, api
tags: [whatsapp, webhook, voice, expert-isolation, zustand]

# Dependency graph
requires:
  - phase: 02-auth-security-hardening
    provides: "authStore with getActiveExpertId, RLS transition policies on whatsapp_rotacao"
  - phase: 04-white-label-plan-limits
    provides: "ExpertProfile type, impersonation flow"
provides:
  - "ExpertProfile with voice_id and voice_settings fields"
  - "Webhook payloads enriched with expert_id for n8n context resolution"
  - "Audio tipo_envio disabled in Mensagens when expert has no voice_id"
  - "voiceEnabled prop pattern for MensagemCard and FollowupCard"
affects: [05-02, 05-03]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "voiceEnabled prop pattern for conditional audio disabling across message cards"
    - "useAuthStore.getState().getActiveExpertId() in webhook payloads outside React lifecycle"

key-files:
  created: []
  modified:
    - src/types/index.ts
    - src/hooks/useWhatsappRotacao.ts
    - src/pages/Mensagens.tsx
    - src/components/mensagens/MensagemCard.tsx
    - src/components/mensagens/FollowupCard.tsx

key-decisions:
  - "voice_id and voice_settings added to ExpertProfile type (already returned by admin_login RPC from experts table)"
  - "Audio disabling applied to create form select, MensagemCard toggle, and FollowupCard toggle via voiceEnabled prop"
  - "No explicit expert_id filter on Supabase queries -- RLS transition policies handle SELECT filtering"

patterns-established:
  - "voiceEnabled prop: boolean flag passed to card components to conditionally disable audio-related UI"
  - "expert_id in webhook payloads: useAuthStore.getState().getActiveExpertId() called inside useCallback functions"

requirements-completed: [WAPP-01, WAPP-02, WAPP-03, WAPP-05, WAPP-06, VOIC-01, VOIC-02, VOIC-04]

# Metrics
duration: 4min
completed: 2026-03-28
---

# Phase 5 Plan 1: Frontend Webhook + Voice Isolation Summary

**Expert-scoped webhook payloads with expert_id, ExpertProfile voice_id typing, and conditional audio disabling in Mensagens page**

## Performance

- **Duration:** 4 min
- **Started:** 2026-03-28T03:45:32Z
- **Completed:** 2026-03-28T03:49:33Z
- **Tasks:** 2
- **Files modified:** 5

## Accomplishments
- ExpertProfile type now includes voice_id and voice_settings fields for frontend voice awareness
- All 3 webhook functions (criarInstancia, reconectar, excluirNumero) send expert_id in payload for n8n context resolution
- Audio tipo_envio option disabled across Mensagens create form, MensagemCard, and FollowupCard when expert has no voice_id

## Task Commits

Each task was committed atomically:

1. **Task 1: Add expert_id to ExpertProfile type and enrich webhook payloads** - `8c17fc2` (feat)
2. **Task 2: Disable audio option in Mensagens when expert has no voice_id** - `36da85a` (feat)

## Files Created/Modified
- `src/types/index.ts` - Added voice_id and voice_settings to ExpertProfile interface
- `src/hooks/useWhatsappRotacao.ts` - Added useAuthStore import, expert_id to 3 webhook payloads
- `src/pages/Mensagens.tsx` - Added hasVoiceId derivation, audio guard on create form select, voiceEnabled prop to cards
- `src/components/mensagens/MensagemCard.tsx` - Added voiceEnabled prop, disabled audio toggle with tooltip when false
- `src/components/mensagens/FollowupCard.tsx` - Added voiceEnabled prop, disabled audio toggle with tooltip when false

## Decisions Made
- voice_id and voice_settings added to ExpertProfile type (already returned by admin_login RPC from experts table but was untyped)
- Audio disabling applied to all 3 places where tipo_envio can be set: create form select, MensagemCard toggle, FollowupCard toggle
- No explicit expert_id filter needed on Supabase queries since RLS transition policies from Phase 2 handle SELECT filtering
- Used useAuthStore.getState() (outside React lifecycle) in useCallback webhook functions for expert_id resolution

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 2 - Missing Critical] Extended audio disabling to FollowupCard**
- **Found during:** Task 2 (audio disable implementation)
- **Issue:** Plan mentioned checking MensagemCard for tipo_envio toggle but FollowupCard also has a 4-option tipo_envio toggle that needed the same voiceEnabled guard
- **Fix:** Added voiceEnabled prop to FollowupCard interface and disabled audio button when false
- **Files modified:** src/components/mensagens/FollowupCard.tsx
- **Verification:** TypeScript compiles clean, lint passes
- **Committed in:** 36da85a (Task 2 commit)

---

**Total deviations:** 1 auto-fixed (1 missing critical)
**Impact on plan:** Essential for consistent audio disabling across all message card types. No scope creep.

## Issues Encountered
None

## Known Stubs
None - all data sources are wired. voice_id comes from ExpertProfile returned by admin_login RPC. expert_id comes from authStore.getActiveExpertId().

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Frontend is ready for n8n workflow updates (Plan 02) which will consume the expert_id from webhook payloads
- Voice settings (Plan 03) will use the voice_id and voice_settings fields now typed in ExpertProfile

## Self-Check: PASSED

- All 5 modified files exist on disk
- Commit 8c17fc2 (Task 1) verified
- Commit 36da85a (Task 2) verified
- TypeScript compilation: clean (0 errors)
- Lint: only pre-existing errors (4651, no new ones)

---
*Phase: 05-whatsapp-n8n-workflows-voice*
*Completed: 2026-03-28*
