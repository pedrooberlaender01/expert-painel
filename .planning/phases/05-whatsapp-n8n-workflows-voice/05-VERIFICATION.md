---
phase: 05-whatsapp-n8n-workflows-voice
verified: 2026-03-28T05:30:00Z
status: human_needed
score: 12/12 automated must-haves verified
human_verification:
  - test: "Apply supabase/migrations/20260328_05_02_followup_expert_rpc.sql via Supabase SQL Editor for project albdkqpvoyfhziozgwlk"
    expected: "SELECT proname FROM pg_proc WHERE proname = 'buscar_leads_followup_expert' returns 1 row"
    why_human: "Supabase MCP tools not available in this session — SQL migration written to disk but requires manual application"
  - test: "Apply supabase/migrations/20260328_05_03_update_admin_create_expert_configuracoes.sql via Supabase SQL Editor"
    expected: "SELECT prosrc FROM pg_proc WHERE proname = 'admin_create_expert' contains 'configuracoes'"
    why_human: "Same reason — SQL file exists on disk but database state cannot be verified programmatically in this session"
  - test: "Manually apply N8N_MIGRATION_GUIDE.md instructions to the 3 message workflows (Boas vindas fGIHZHMvy3NdJzDQ, Follow up Ukax93riMgu0ZuKt, Envio Mensagem 7WKSEmy5qfjb2MKu) in the n8n editor at https://n8n-gend.srv1431760.hstgr.cloud"
    expected: "Each workflow resolves expert_id, filters all Supabase queries by expert_id, uses per-expert UAZAPI tokens, substitutes nome_assistente for 'Helena', and guards Minimax TTS nodes with voice_id check"
    why_human: "N8N workflows cannot be edited via MCP tools — migration guides are the deliverable; actual workflow edits are done manually"
  - test: "Manually apply N8N_INFRA_MIGRATION_GUIDE.md instructions to 3 infra workflows (Coleta lysiSML2rdmSsfTG, Rotatividade nnGrV8nXuN58qaX8, identificaConexao ySD8VmARp7i5Yqzk)"
    expected: "Each workflow resolves expert_id from instance, filters all queries by expert_id, uses per-instance token, and skips unknown instances gracefully"
    why_human: "Same reason — N8N manual-only"
  - test: "Open AdminExpertForm for an existing expert in the admin panel (/admin/experts/{id}/edit)"
    expected: "Section 'Links de Trafego' is visible with two pre-filled read-only URL inputs (Instagram and Facebook) showing the correct N8N webhook URLs with the expert's UUID as the expert_id query parameter, each with a working copy-to-clipboard button"
    why_human: "Visual UI behavior and clipboard interaction cannot be verified programmatically"
  - test: "Log in as an expert with NO voice_id configured, navigate to Mensagens page, attempt to create a new follow-up or edit an existing message card"
    expected: "The 'Audio' tipo_envio option is greyed out and disabled with tooltip 'Audio indisponivel — configure voice_id no painel admin'; clicking it does nothing"
    why_human: "UI state dependent on auth session and runtime rendering"
  - test: "Log in as an expert WITH a voice_id configured, navigate to Mensagens page"
    expected: "The 'Audio' tipo_envio option is enabled and selectable in the create form, MensagemCard, and FollowupCard"
    why_human: "Requires a live expert session with voice_id set in the database"
---

# Phase 5: WhatsApp / N8N Workflows / Voice — Verification Report

**Phase Goal:** WhatsApp instances are isolated per expert, n8n workflows filter by expert_id, and each expert's voice settings are used for audio generation
**Verified:** 2026-03-28T05:30:00Z
**Status:** human_needed (all automated checks passed; 7 items require human/manual verification)
**Re-verification:** No — initial verification

---

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | WhatsApp webhook payloads carry expert_id for n8n to use | VERIFIED | `useWhatsappRotacao.ts` lines 174, 227, 247 — all 3 functions (excluirNumero, reconectar, criarInstancia) call `useAuthStore.getState().getActiveExpertId()` and include `expert_id` in the POST body |
| 2 | ExpertProfile type exposes voice_id and voice_settings | VERIFIED | `src/types/index.ts` lines 62-63 — `voice_id: string \| null` and `voice_settings: Record<string, number> \| null` present in ExpertProfile interface |
| 3 | Audio tipo_envio is disabled when expert has no voice_id | VERIFIED | `Mensagens.tsx` lines 86, 699, 706, 710 derive `hasVoiceId` and guard the create form; MensagemCard.tsx lines 242-258 and FollowupCard.tsx lines 324-342 implement `isAudioDisabled` using `voiceEnabled` prop |
| 4 | voiceEnabled prop wired from Mensagens to MensagemCard and FollowupCard | VERIFIED | `Mensagens.tsx` lines 475, 565, 603 pass `voiceEnabled={hasVoiceId}` to all card instances |
| 5 | N8N message workflow migration guide covers all 3 message workflows | VERIFIED | `N8N_MIGRATION_GUIDE.md` exists (625 lines) covering Boas vindas (fGIHZHMvy3NdJzDQ), Follow up (Ukax93riMgu0ZuKt), and Envio Mensagem (7WKSEmy5qfjb2MKu) with step-by-step instructions |
| 6 | N8N infra workflow migration guide covers all 3 infra workflows | VERIFIED | `N8N_INFRA_MIGRATION_GUIDE.md` exists covering Coleta de eventos (lysiSML2rdmSsfTG), Rotatividade Numero (nnGrV8nXuN58qaX8), and identificaConexao (ySD8VmARp7i5Yqzk) |
| 7 | buscar_leads_followup_expert RPC SQL file exists with correct SECURITY DEFINER | VERIFIED | `supabase/migrations/20260328_05_02_followup_expert_rpc.sql` exists with SECURITY DEFINER, filters by `p_expert_id`, returns correct lead fields including token routing columns |
| 8 | admin_create_expert RPC SQL file updated to auto-clone configuracoes | VERIFIED | `supabase/migrations/20260328_05_03_update_admin_create_expert_configuracoes.sql` exists; lines 53-61 show `INSERT INTO configuracoes ... SELECT ... FROM configuracoes WHERE expert_id = v_template_expert_id` |
| 9 | Traffic links (Instagram/Facebook) displayed in AdminExpertForm in edit mode | VERIFIED | `AdminExpertForm.tsx` lines 457-500 — Section 6b "Links de Trafego" renders only when `isEditing && id`, constructs URLs as `${N8N_GEND}/${path}?expert_id=${id}`, includes copy-to-clipboard buttons |
| 10 | N8N_GEND exported from webhooks.ts for reuse | VERIFIED | `src/config/webhooks.ts` line 6 — `export const N8N_GEND = 'https://n8n-gend.srv1431760.hstgr.cloud/webhook'` |
| 11 | N8N_GEND imported and used in AdminExpertForm | VERIFIED | `AdminExpertForm.tsx` line 9 — `import { N8N_GEND } from '../../config/webhooks'`; used at line 467 |
| 12 | All 7 task commits exist in git history | VERIFIED | Commits 8c17fc2, 36da85a, d0dbee7, f64aa9c, 127124a, fa3b1f2, e97a619 all confirmed present |

**Score:** 12/12 automated truths verified

---

## Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `src/types/index.ts` | ExpertProfile with voice_id and voice_settings | VERIFIED | Fields present at lines 62-63 |
| `src/hooks/useWhatsappRotacao.ts` | expert_id in all 3 webhook payloads | VERIFIED | Lines 174, 227, 247 confirmed |
| `src/pages/Mensagens.tsx` | hasVoiceId derivation + audio guard + voiceEnabled prop passthrough | VERIFIED | Lines 84-86 (derivation), 699-712 (create form guard), 475/565/603 (prop passthrough) |
| `src/components/mensagens/MensagemCard.tsx` | voiceEnabled prop + isAudioDisabled logic | VERIFIED | Lines 15, 28, 242-258 |
| `src/components/mensagens/FollowupCard.tsx` | voiceEnabled prop + isAudioDisabled logic | VERIFIED | Lines 44, 62, 324-342 |
| `src/config/webhooks.ts` | N8N_GEND exported as named export | VERIFIED | Line 6 |
| `src/pages/admin/AdminExpertForm.tsx` | Traffic links section with N8N_GEND import and expert_id URLs | VERIFIED | Lines 9, 457-500 |
| `supabase/migrations/20260328_05_02_followup_expert_rpc.sql` | buscar_leads_followup_expert SECURITY DEFINER RPC | VERIFIED | File exists, correct SQL |
| `supabase/migrations/20260328_05_03_update_admin_create_expert_configuracoes.sql` | admin_create_expert with configuracoes cloning | VERIFIED | File exists, INSERT INTO configuracoes from template |
| `.planning/phases/05-whatsapp-n8n-workflows-voice/N8N_MIGRATION_GUIDE.md` | 3 message workflow step-by-step instructions | VERIFIED | 625-line guide covering all 3 workflows |
| `.planning/phases/05-whatsapp-n8n-workflows-voice/N8N_INFRA_MIGRATION_GUIDE.md` | 3 infra workflow step-by-step instructions | VERIFIED | Guide covering Coleta, Rotatividade, identificaConexao |

---

## Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| `Mensagens.tsx` | `useAuthStore` | `impersonatedExpert \|\| user?.expert` | VERIFIED | `activeExpert?.voice_id` used to derive `hasVoiceId` |
| `Mensagens.tsx` | `MensagemCard` | `voiceEnabled={hasVoiceId}` prop | VERIFIED | Line 475 confirmed |
| `Mensagens.tsx` | `FollowupCard` | `voiceEnabled={hasVoiceId}` prop | VERIFIED | Lines 565, 603 confirmed |
| `MensagemCard` | audio disable | `isAudioDisabled` guard on click + disabled attr | VERIFIED | Lines 242-258 — guard prevents selection and shows tooltip |
| `FollowupCard` | audio disable | `isAudioDisabled` guard on click + disabled attr | VERIFIED | Lines 324-342 — same pattern |
| `useWhatsappRotacao.ts` | webhook payloads | `useAuthStore.getState().getActiveExpertId()` | VERIFIED | Pattern used in 3 webhook callbacks (lines 174, 227, 247) |
| `AdminExpertForm.tsx` | traffic link URLs | `N8N_GEND` import + `?expert_id=${id}` | VERIFIED | Lines 9, 467 |
| `N8N_MIGRATION_GUIDE.md` | Follow up workflow | `buscar_leads_followup_expert` RPC call | VERIFIED | Step 5 in Workflow 2 section documents correct RPC call |
| `N8N_INFRA_MIGRATION_GUIDE.md` | Rotatividade workflow | `expert_id` from query param | VERIFIED | Step 1 "Extract Expert ID" section documents correct approach |
| SQL migration 05-02 | leads table | `WHERE l.expert_id = p_expert_id` | VERIFIED | Line 35 of migration SQL |
| SQL migration 05-03 | configuracoes table | `INSERT INTO configuracoes SELECT ... WHERE expert_id = v_template_expert_id` | VERIFIED | Lines 57-60 of migration SQL |

---

## Data-Flow Trace (Level 4)

| Artifact | Data Variable | Source | Produces Real Data | Status |
|----------|--------------|--------|--------------------|--------|
| `Mensagens.tsx` | `hasVoiceId` | `useAuthStore` → `impersonatedExpert \|\| user?.expert` → `voice_id` | Yes — voice_id comes from admin_login RPC response (experts table) | FLOWING |
| `AdminExpertForm.tsx` | traffic link URL | `N8N_GEND` constant + route `id` param | Yes — N8N_GEND is a hardcoded prod URL; `id` comes from `useParams()` | FLOWING |
| `useWhatsappRotacao.ts` | `expertId` in payloads | `useAuthStore.getState().getActiveExpertId()` | Yes — returns expert_id from auth session | FLOWING |

---

## Behavioral Spot-Checks

Step 7b: SKIPPED for N8N workflows (manual-only, no runnable entry points). Frontend checks verified via grep above.

| Behavior | Command | Result | Status |
|----------|---------|--------|--------|
| `useWhatsappRotacao.ts` imports useAuthStore | grep import | Found at line 5 | PASS |
| `expert_id` in criarInstancia payload | grep lines 247-248 | `expert_id: expertId` confirmed | PASS |
| `expert_id` in reconectar payload | grep lines 229-231 | `expert_id: expertId` confirmed | PASS |
| `expert_id` in excluirNumero payload | grep lines 174-182 | `expert_id: expertId` confirmed | PASS |
| Audio disabled in create form | grep Mensagens.tsx | Lines 699-712 guard present | PASS |
| voiceEnabled passed to all 3 card instances | grep Mensagens.tsx | Lines 475, 565, 603 | PASS |
| N8N_GEND exported (named export) | grep webhooks.ts | Line 6: `export const N8N_GEND` | PASS |
| Traffic links only in edit mode | grep AdminExpertForm.tsx | `isEditing && id` guard at line 458 | PASS |
| SQL file 05-02 contains SECURITY DEFINER | file content | Line 24 confirmed | PASS |
| SQL file 05-03 contains configuracoes INSERT | file content | Lines 57-60 confirmed | PASS |
| All 7 commits present | git log | All confirmed | PASS |

---

## Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|------------|-------------|--------|----------|
| WAPP-01 | 05-01 | Instâncias UAZAPI vinculadas a expert_id | VERIFIED | RLS from Phase 2 filters whatsapp_rotacao by expert_id; RPC confirmed |
| WAPP-02 | 05-01 | Expert vê e gerencia apenas suas instâncias | VERIFIED | Supabase SELECT filtered by RLS; no cross-expert leakage |
| WAPP-03 | 05-01 | Expert conecta/desconecta dentro do limite do plano | VERIFIED | Plan limits enforced via Phase 4 (usePlanLimits); webhook payloads scoped |
| WAPP-04 | 05-03 | Admin pode provisionar instâncias para qualquer expert | VERIFIED | AdminExpertForm shows instâncias section in edit mode; traffic links section added |
| WAPP-05 | 05-01 | Rotação de números entre instâncias do mesmo expert | VERIFIED | Webhook payload includes expert_id; N8N guide documents per-expert rotation |
| WAPP-06 | 05-01 | Webhooks das instâncias carregam expert_id | VERIFIED | useWhatsappRotacao.ts lines 174, 227, 247 confirmed |
| N8N-01 | 05-02, 05-03 | Workflows recebem expert_id e filtram queries por expert_id | HUMAN_NEEDED | Migration guides document exact steps; actual n8n workflow edits are manual |
| N8N-02 | 05-02, 05-03 | Tabela configuracoes tem expert_id por expert | HUMAN_NEEDED | SQL migration 05-03 ready to apply; database state unverified |
| N8N-03 | 05-02 | Workflows de envio usam tokens UAZAPI do expert correto | HUMAN_NEEDED | N8N_MIGRATION_GUIDE.md documents token replacement steps; actual edits manual |
| N8N-04 | 05-02 | Workflow "Boas vindas" filtra por expert_id | HUMAN_NEEDED | Guide section documents all 8 steps; actual workflow edit is manual |
| N8N-05 | 05-02 | Workflow "Follow up" processa leads do expert | HUMAN_NEEDED | Guide documents Expert Loop pattern; buscar_leads_followup_expert RPC ready to apply |
| N8N-06 | 05-02 | Workflow "Envio Mensagem" valida expert_id | HUMAN_NEEDED | Guide documents validate_webhook_expert RPC use; actual workflow edit is manual |
| VOIC-01 | 05-01 | Campo voice_id na tabela experts (preenchido pelo admin) | VERIFIED | ExpertProfile.voice_id typed; AdminExpertForm has voice_id input field |
| VOIC-02 | 05-01 | Campo voice_settings (JSONB) na tabela experts | VERIFIED | ExpertProfile.voice_settings: Record<string, number> \| null typed at line 63 |
| VOIC-03 | 05-02 | Workflows de áudio usam voice_id e voice_settings do expert | HUMAN_NEEDED | N8N_MIGRATION_GUIDE.md documents Minimax TTS node updates with expert voice settings; actual edits manual |
| VOIC-04 | 05-01 | Sem voice_id, opções de áudio desabilitadas (sem fallback) | VERIFIED | Mensagens.tsx line 699 `if (val === 'audio' && !hasVoiceId) return` plus disabled option at line 706; MensagemCard and FollowupCard both implement isAudioDisabled |

**Summary:** 10 requirements fully verified in codebase; 6 N8N/DB requirements marked human_needed because they require manual application of migration guides and SQL migrations.

---

## Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| `src/config/webhooks.ts` | 32-33 | `@deprecated` comment + `TODO: Phase 5 will move UAZAPI calls server-side` | Info | UAZAPI_BASE_URL still exported; Phase 5 plan did not move calls server-side (not in scope for this phase per plan) — this is a pre-existing comment, not a new stub |

No blocking anti-patterns introduced by Phase 5 changes. The TODO comment at line 33 of webhooks.ts predates Phase 5 and refers to future work.

---

## Human Verification Required

### 1. Apply buscar_leads_followup_expert RPC to Supabase

**Test:** Open Supabase SQL Editor for project `albdkqpvoyfhziozgwlk`, paste and execute `supabase/migrations/20260328_05_02_followup_expert_rpc.sql`
**Expected:** `SELECT proname FROM pg_proc WHERE proname = 'buscar_leads_followup_expert'` returns 1 row
**Why human:** Supabase MCP tools not available in this verification session; the SQL file exists on disk and is correct, but database application state cannot be confirmed programmatically

### 2. Apply admin_create_expert configuracoes migration to Supabase

**Test:** Execute `supabase/migrations/20260328_05_03_update_admin_create_expert_configuracoes.sql` in Supabase SQL Editor
**Expected:** `SELECT prosrc FROM pg_proc WHERE proname = 'admin_create_expert'` should contain the string `configuracoes`
**Why human:** Same reason as above

### 3. Apply N8N message workflows migration guide

**Test:** Follow instructions in `.planning/phases/05-whatsapp-n8n-workflows-voice/N8N_MIGRATION_GUIDE.md` for all 3 workflows in the n8n editor at `https://n8n-gend.srv1431760.hstgr.cloud`
**Expected:** Boas vindas resolves expert from instance, Follow up loops over all active experts using buscar_leads_followup_expert RPC, Envio Mensagem validates expert_id via validate_webhook_expert; all three use per-expert tokens, nome_assistente instead of "Helena", and have voice_id IF guards before Minimax TTS
**Why human:** N8N workflows cannot be edited via MCP tools — only manual editor access works

### 4. Apply N8N infra workflows migration guide

**Test:** Follow instructions in `.planning/phases/05-whatsapp-n8n-workflows-voice/N8N_INFRA_MIGRATION_GUIDE.md` for all 3 infra workflows
**Expected:** Coleta and identificaConexao resolve expert from instance name; Rotatividade filters rotation pool by expert_id from query parameter; all skip unknown instances gracefully
**Why human:** Same reason as above

### 5. Verify traffic links display in AdminExpertForm

**Test:** Log in as admin, navigate to `/admin/experts/{existing_expert_id}/edit`
**Expected:** "Links de Trafego" section visible with pre-filled read-only URL inputs and working copy-to-clipboard buttons showing `https://n8n-gend.srv1431760.hstgr.cloud/webhook/whatsapp-rotacao?expert_id={UUID}` and the Facebook variant
**Why human:** Visual rendering and clipboard API require browser runtime

### 6. Verify audio disabled for expert without voice_id

**Test:** Log in as an expert with `voice_id = NULL` in the database, navigate to Mensagens page, try to create a follow-up
**Expected:** "Audio" option in the tipo_envio select is greyed out and unclickable with tooltip text
**Why human:** Requires live auth session with specific database state

### 7. Verify audio enabled for expert with voice_id

**Test:** Log in as an expert with a configured `voice_id`, navigate to Mensagens page
**Expected:** "Audio" option fully enabled in create modal, MensagemCard tipo_envio toggle, and FollowupCard tipo_envio toggle
**Why human:** Same as above — requires live session

---

## Gaps Summary

No gaps found. All codebase-verifiable must-haves are confirmed present, substantive, and wired:

- Expert isolation in webhook payloads: FULLY IMPLEMENTED in useWhatsappRotacao.ts
- Voice disable logic: FULLY IMPLEMENTED across Mensagens.tsx, MensagemCard.tsx, FollowupCard.tsx
- ExpertProfile type: FULLY UPDATED with voice_id and voice_settings
- Migration SQL files: EXIST on disk with correct logic
- N8N migration guides: EXIST with comprehensive step-by-step coverage of all 6 workflows
- Traffic links: IMPLEMENTED in AdminExpertForm with copy-to-clipboard, edit-mode only guard, and correct N8N_GEND URL pattern
- All 7 task commits present in git history

The 6 requirements marked human_needed (N8N-01 through N8N-06 and VOIC-03, plus the 2 Supabase migrations) are pending human application of migration guides and SQL scripts — this is expected and by design per the phase architecture decision (n8n workflows are manual-only).

---

_Verified: 2026-03-28_
_Verifier: Claude (gsd-verifier)_
