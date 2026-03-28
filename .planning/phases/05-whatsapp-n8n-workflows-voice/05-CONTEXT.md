# Phase 5: WhatsApp, N8N Workflows & Voice - Context

**Gathered:** 2026-03-28
**Status:** Ready for planning

<domain>
## Phase Boundary

WhatsApp instance isolation per expert (rotation, management, webhooks). N8N workflow updates for multi-tenant filtering on 6 priority workflows. Voice settings per expert with Minimax integration (n8n-side). Nome_assistente substitution in n8n workflows (WLBL-06 from Phase 4). Configurações table becomes per-expert.

</domain>

<decisions>
## Implementation Decisions

### WhatsApp Instance Isolation
- **D-01:** Rotation logic (useWhatsappRotacao + whatsapp_rotacao_config) filters by expert_id. Each expert cycles only their own numbers.
- **D-02:** Frontend already shows only expert's instances via RLS transition policies (Phase 2). This phase tightens the rotation logic.
- **D-03:** Plan limit on instances already enforced in CentralWhatsapp (Phase 4 PLAN-05). This phase ensures rotation respects the same boundary.

### Webhook Expert_id Resolution
- **D-04:** Webhooks from UAZAPI arrive with instância name/number. N8N does LOOKUP in whatsapp_rotacao to find the expert_id for that instance. No need to change UAZAPI metadata.
- **D-05:** validate_webhook_expert RPC already exists (Phase 2). N8N calls it to confirm instance belongs to claimed expert.

### N8N Workflow Updates
- **D-06:** Update workflows IN-PLACE gradually. Since only 1 expert exists (Allan), no risk of breaking multi-tenant data. Workflows without expert_id continue working.
- **D-07:** Only 6 priority workflows in scope: Boas vindas - Leads Insta, Follow up - assistente, Envio Mensagem - Saas, Coleta de eventos, Rotatividade Número - Tráfego, identificaConexão. Other 13 workflows stay global for now.
- **D-08:** Each workflow update adds: lookup expert_id from instance → filter Supabase queries by expert_id → use expert's UAZAPI tokens from whatsapp_rotacao → use expert's voice_id/settings.

### Configurações Per-Expert
- **D-09:** Keep existing configuracoes table. It already has expert_id (Phase 1). Duplicate Allan's 8 config rows as template for each new expert created. Workflows query configuracoes WHERE expert_id = {expert_id}.
- **D-10:** Config keys that become per-expert: link_comunidade, link_cadastro, horario_lives, all followup_*_horas, pergunta_entrada_horas.

### Voice (Minimax) Integration
- **D-11:** Audio generation happens in N8N workflows (not frontend). Workflows call Minimax TTS API with expert's voice_id and voice_settings.
- **D-12:** If expert has NO voice_id configured: voice-related message options in the funil are DISABLED (grayed out). No fallback voice — expert must have their own voice_id to use audio features.
- **D-13:** voice_id and voice_settings already stored in experts table (Phase 1). N8N reads them via Supabase query when generating audio.
- **D-14:** Minimax TTS endpoint: POST https://api.minimax.io/v1/t2a_async_v2 with model speech-2.8-hd.

### Nome da Assistente (WLBL-06)
- **D-15:** "Helena" only appears in N8N workflows (not in database templates or frontend). Workflows substitute with expert's nome_assistente from experts table.
- **D-16:** Each workflow that generates or sends personalized messages reads nome_assistente from the expert record and replaces "Helena" references.

### Claude's Discretion
- Exact n8n node configuration for expert_id lookup
- How to structure the Supabase query nodes in n8n for expert filtering
- Minimax API request format details (headers, body structure)
- Which n8n nodes need modification in each workflow
- Error handling when Minimax API fails (retry logic, text fallback)

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### WhatsApp
- `src/hooks/useWhatsappRotacao.ts` — Rotation hook, needs expert_id filtering
- `src/pages/CentralWhatsapp.tsx` — Instance management page (already has plan limits from Phase 4)
- `src/components/numeros/InstanciaCard.tsx` — Instance card component

### N8N Workflows (use MCP tools to inspect)
- Workflow "Boas vindas - Leads Insta" (fGIHZHMvy3NdJzDQ) — Lead welcome flow
- Workflow "Follow up - assistente" (Ukax93riMgu0ZuKt) — Follow-up automation
- Workflow "Envio Mensagem - Saas" (7WKSEmy5qfjb2MKu) — Message sending
- Workflow "Coleta de eventos" (lysiSML2rdmSsfTG) — Event collection
- Workflow "Rotatividade Número - Tráfego" (nnGrV8nXuN58qaX8) — Number rotation
- Workflow "identificaConexão" (ySD8VmARp7i5Yqzk) — Connection identification

### Database
- `src/types/database.ts` — ExpertRow (has voice_id, voice_settings), ConfiguracaoRow
- Supabase configuracoes table — 8 rows with expert_id, per-expert config

### Existing RPCs (Phase 2)
- `validate_webhook_expert(p_expert_id, p_instancia)` — Validates instance belongs to expert
- `get_expert_instances(p_expert_id)` — Token-free instance listing

### Project Context
- `.planning/PROJECT.md` — Minimax API endpoints documented in Context section
- `.planning/phases/02-auth-security-hardening/02-CONTEXT.md` — D-08/D-09 webhook/token decisions

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- validate_webhook_expert RPC — Already validates instance-expert ownership
- get_expert_instances RPC — Token-free instance listing
- useWhatsappRotacao hook — Needs expert_id filter added
- PlanLimitBanner — Already enforces instance limits on CentralWhatsapp

### Established Patterns
- N8N workflows use Supabase nodes for queries + HTTP Request nodes for UAZAPI/Minimax
- Webhook trigger → Supabase lookup → process → UAZAPI send is the standard flow
- Expert profile in authStore has voice_id, voice_settings, nome_assistente

### Integration Points
- N8N Supabase nodes — Add WHERE expert_id = {{expert_id}} to all queries
- N8N HTTP Request nodes — Use expert's UAZAPI token (from whatsapp_rotacao) instead of global
- N8N Minimax nodes — Use expert's voice_id and voice_settings
- configuracoes table — Queries become per-expert

</code_context>

<specifics>
## Specific Ideas

- N8N workflow updates can use the MCP n8n tools to inspect current workflow structure before modifying
- The "lookup expert_id from instance" pattern should be a reusable n8n sub-workflow or code node that all 6 workflows reference
- For new experts, admin_create_expert RPC (Phase 3) should auto-duplicate configuracoes rows from a template

</specifics>

<deferred>
## Deferred Ideas

None — this is the final phase of the multi-tenant transformation

</deferred>

---

*Phase: 05-whatsapp-n8n-workflows-voice*
*Context gathered: 2026-03-28*
