# N8N Message Workflows — Multi-Tenant Migration Guide

**Phase:** 05-whatsapp-n8n-workflows-voice (Plan 02)
**Date:** 2026-03-28
**Purpose:** Step-by-step instructions to update 3 message-oriented n8n workflows for multi-tenant expert_id isolation, nome_assistente substitution, and voice_id/voice_settings routing.

> **Note:** These workflows cannot be edited via MCP tools — they must be manually updated in the n8n editor at `https://n8n-gend.srv1431760.hstgr.cloud`.

---

## Table of Contents

1. [Common Patterns](#common-patterns)
2. [Workflow 1: Boas vindas - Leads Insta](#workflow-1-boas-vindas---leads-insta-fgihzhmvy3ndjzdq)
3. [Workflow 2: Follow up - assistente](#workflow-2-follow-up---assistente-ukax93rimgu0zukt)
4. [Workflow 3: Envio Mensagem - Saas](#workflow-3-envio-mensagem---saas-7wksemy5qfjb2mku)
5. [Post-Migration Verification](#post-migration-verification-checklist)
6. [Reference Tables](#reference-tables)

---

## Common Patterns

### Pattern A: Expert Resolution from Instance (Webhook-triggered)

Used by **Boas vindas** workflow. Add a Supabase node immediately after the webhook trigger:

```sql
SELECT wr.expert_id, e.nome_assistente, e.voice_id, e.voice_settings, wr.token, wr.instancia, wr.telefone_enviou
FROM whatsapp_rotacao wr
JOIN experts e ON e.id = wr.expert_id
WHERE wr.instancia = '{{ $json.instancia }}'
  AND wr.ativo = true
LIMIT 1
```

- **Node name:** `Resolve Expert`
- **Node type:** Supabase (Execute SQL) or Supabase (Select with join)
- **Output:** `expert_id`, `nome_assistente`, `voice_id`, `voice_settings`, `token`

After this node, reference expert data as: `{{ $node["Resolve Expert"].json.expert_id }}`

### Pattern B: Expert Loop (Schedule-triggered)

Used by **Follow up** workflow. Since there is NO instance in the trigger payload, the workflow must iterate over ALL active experts:

```sql
SELECT id AS expert_id, nome_assistente, voice_id, voice_settings
FROM experts
WHERE ativo = true
```

Then use **SplitInBatches** to process each expert independently.

### Pattern C: Expert Validation from Payload (Frontend-triggered)

Used by **Envio Mensagem** workflow. The frontend sends `expert_id` in the webhook payload (enriched by Plan 05-01):

```sql
SELECT validate_webhook_expert('{{ $json.expert_id }}', '{{ $json.instancia }}')
```

If false, reject the request.

### Nome Assistente Substitution

In ALL 3 workflows, find every node containing the text "Helena" and replace with the dynamic reference:
- `{{ $node["Resolve Expert"].json.nome_assistente }}` (Boas vindas, Envio Mensagem)
- `{{ $json.nome_assistente }}` (Follow up, inside SplitInBatches loop)

Common locations where "Helena" appears:
- Text message bodies (audio script text)
- Welcome messages
- Follow-up message templates
- Any greeting or signature text

### Voice Settings Pattern

For audio-generating nodes (Minimax TTS), replace hardcoded voice settings:

**Before (hardcoded):**
```json
{
  "model": "speech-2.8-hd",
  "text": "...",
  "voice_id": "HARDCODED_VOICE_ID",
  "voice_setting": { "speed": 1, "pitch": 0, "vol": 1, "timbre": 0 }
}
```

**After (dynamic):**
```json
{
  "model": "speech-2.8-hd",
  "text": "...",
  "voice_id": "{{ voice_id_reference }}",
  "voice_setting": {{ voice_settings_reference }}
}
```

**IMPORTANT:** Add an IF node before audio generation — skip audio if `voice_id` is empty (expert has not configured voice cloning yet).

---

## Workflow 1: Boas vindas - Leads Insta (fGIHZHMvy3NdJzDQ)

### Current State
- **Trigger:** Webhook (receives instance name from UAZAPI when a new lead arrives from Instagram)
- **Purpose:** Sends welcome messages (text + audio) to new Instagram leads
- **Trigger type:** POST webhook with `instancia` in the payload
- **Issues to fix:**
  - No expert_id resolution from instance
  - Supabase queries not filtered by expert_id
  - UAZAPI tokens may be hardcoded
  - "Helena" hardcoded in message text
  - Voice_id hardcoded for Minimax TTS
  - Configuracoes not filtered by expert_id

### Changes Required

#### Step 1: Add Expert Resolution Node (FIRST PRIORITY)

1. Open workflow `fGIHZHMvy3NdJzDQ` in the n8n editor
2. Click the connection between the **Webhook trigger** and the first processing node
3. Add a new **Supabase** node (or **Postgres** node with raw SQL) between them
4. Configure with SQL:
   ```sql
   SELECT wr.expert_id, e.nome_assistente, e.voice_id, e.voice_settings,
          wr.token, wr.instancia, wr.numero, wr.telefone_enviou
   FROM whatsapp_rotacao wr
   JOIN experts e ON e.id = wr.expert_id
   WHERE wr.instancia = '{{ $json.instancia }}'
     AND wr.ativo = true
   LIMIT 1
   ```
5. Name this node: **`Resolve Expert`**
6. Connect: Webhook trigger -> Resolve Expert -> (rest of workflow)

#### Step 2: Add Expert Validation Gate

1. After `Resolve Expert`, add an **IF** node
2. Condition: `{{ $node["Resolve Expert"].json.expert_id }}` is not empty
3. **True branch:** continues to lead processing
4. **False branch:** connects to **No Operation** node (unknown instance — log and skip)
5. Name: **`Expert Found?`**

#### Step 3: Filter Lead Queries by Expert

1. Find ALL Supabase SELECT nodes that query the `leads` table
2. Add filter to each: `AND expert_id = '{{ $node["Resolve Expert"].json.expert_id }}'`
3. This ensures new leads are matched only within the expert's own lead pool

**Typical nodes to modify:**
- Lead lookup by phone number
- Lead status check
- Lead update after message sent

#### Step 4: Filter Configuracoes by Expert

1. Find any Supabase node that reads from `configuracoes` table
2. Add filter: `AND expert_id = '{{ $node["Resolve Expert"].json.expert_id }}'`
3. Config keys affected: `link_comunidade`, `link_cadastro`, `horario_lives`, followup timing configs, `pergunta_entrada_horas`

#### Step 5: Replace UAZAPI Token

1. Find ALL HTTP Request nodes that call UAZAPI endpoints
2. Replace any hardcoded token/Bearer header with: `{{ $node["Resolve Expert"].json.token }}`
3. Typical UAZAPI endpoints:
   - Send text message: `/api/messages/send`
   - Send audio: `/api/messages/sendAudio`
   - Send image: `/api/messages/sendImage`

#### Step 6: Replace "Helena" with nome_assistente

1. Search the entire workflow for the string "Helena" (use Ctrl+F in the n8n editor)
2. In every text field where "Helena" appears, replace with:
   `{{ $node["Resolve Expert"].json.nome_assistente }}`
3. Common locations:
   - Message text body nodes (Set/Code nodes that build message text)
   - Audio script text (the text sent to Minimax for TTS)
   - Any greeting template

#### Step 7: Update Minimax TTS Nodes

1. Find HTTP Request nodes calling Minimax TTS (`https://api.minimax.io/v1/t2a_async_v2`)
2. **BEFORE** the Minimax node, add an **IF** node:
   - Condition: `{{ $node["Resolve Expert"].json.voice_id }}` is not empty
   - **True branch:** proceed to Minimax TTS
   - **False branch:** skip audio generation (send text-only message instead)
   - Name: **`Has Voice?`**
3. In the Minimax HTTP Request node, update the body:
   ```json
   {
     "model": "speech-2.8-hd",
     "text": "{{ message_text_with_nome_assistente }}",
     "voice_id": "{{ $node[\"Resolve Expert\"].json.voice_id }}",
     "voice_setting": {{ $node["Resolve Expert"].json.voice_settings }}
   }
   ```
4. The `voice_settings` field is stored as JSONB in the experts table, so it comes pre-formatted

#### Step 8: Update Lead INSERT/UPDATE with Expert ID

1. Find any Supabase INSERT or UPDATE nodes that create/modify `leads` records
2. Add field: `expert_id` = `{{ $node["Resolve Expert"].json.expert_id }}`
3. This ensures new leads created by this workflow are properly tagged

### Connections After Changes
```
Webhook → Resolve Expert → Expert Found?
  → (true) → Lead Lookup (+ expert_id filter) → Has Voice?
    → (true) → Minimax TTS (expert voice) → UAZAPI Send Audio (expert token)
    → (false) → UAZAPI Send Text Only (expert token)
  → (false) → No Operation (skip unknown instance)
```

### Testing Steps
1. Trigger the webhook with a known instance name (e.g., one of Allan's instances)
2. Verify `Resolve Expert` returns Allan's expert_id, nome_assistente, and voice_id
3. Check that lead queries include `WHERE expert_id = '{Allan's UUID}'`
4. Verify UAZAPI calls use the token from whatsapp_rotacao (not hardcoded)
5. Verify message text uses Allan's nome_assistente instead of "Helena"
6. Verify Minimax TTS uses Allan's voice_id
7. Test with an unknown instance name — should be skipped without errors
8. Test with an expert that has NO voice_id — should send text-only (no audio)

---

## Workflow 2: Follow up - assistente (Ukax93riMgu0ZuKt)

### Current State
- **Trigger:** Schedule (runs every 15 minutes)
- **Purpose:** Sends follow-up messages to leads based on their status and timing
- **Trigger type:** SCHEDULE (cron/interval) — NO instance, NO webhook payload
- **Issues to fix:**
  - No expert_id scoping — processes ALL leads globally
  - Single-expert assumption (only Allan's leads)
  - "Helena" hardcoded in follow-up messages
  - Voice_id hardcoded for audio follow-ups
  - Configuracoes timing values not scoped to expert
  - UAZAPI tokens not per-expert

### CRITICAL: Expert Loop Pattern

This workflow is fundamentally different from Boas vindas and Envio Mensagem. Since it is **schedule-triggered** with NO instance in the payload:
1. It must fetch ALL active experts
2. Loop through each expert (SplitInBatches)
3. For each expert: get their leads, configs, tokens, and process independently

### Changes Required

#### Step 1: Add "Fetch Active Experts" Node

1. Open workflow `Ukax93riMgu0ZuKt` in the n8n editor
2. After the **Schedule Trigger** node, add a new **Supabase** node:
   ```sql
   SELECT id AS expert_id, nome_assistente, voice_id, voice_settings
   FROM experts
   WHERE ativo = true
   ```
3. Name: **`Fetch Active Experts`**

#### Step 2: Add SplitInBatches for Expert Loop

1. After `Fetch Active Experts`, add a **SplitInBatches** node
2. Configure:
   - **Batch Size:** 1 (process one expert at a time)
3. Name: **`Loop Experts`**
4. This creates a loop — the workflow processes each expert's leads independently

#### Step 3: Get Expert's UAZAPI Tokens (Inside Loop)

1. Inside the loop (after `Loop Experts` output), add a **Supabase** node:
   ```sql
   SELECT token, instancia, numero, telefone_enviou
   FROM whatsapp_rotacao
   WHERE expert_id = '{{ $json.expert_id }}'
     AND ativo = true
   ORDER BY ordem ASC
   ```
2. Name: **`Get Expert Tokens`**
3. This retrieves the expert's active WhatsApp instances for sending

#### Step 4: Get Expert's Configuracoes (Inside Loop)

1. After or parallel to `Get Expert Tokens`, add a **Supabase** node:
   ```sql
   SELECT chave, valor
   FROM configuracoes
   WHERE expert_id = '{{ $json.expert_id }}'
   ```
2. Name: **`Get Expert Config`**
3. This retrieves timing configs (followup_*_horas, etc.) specific to this expert

#### Step 5: Replace Leads Query with RPC Call

1. Find the existing Supabase node that queries leads for follow-up
2. **Replace** it with a call to the new RPC:
   ```sql
   SELECT * FROM buscar_leads_followup_expert('{{ $json.expert_id }}')
   ```
3. Name: **`Get Expert Leads`**
4. This returns only leads belonging to the current expert in the loop

#### Step 6: Update Follow-up Timing Logic

1. Find the Code/Function nodes that calculate follow-up timing
2. These currently read from a global `configuracoes` result — update references to use `{{ $node["Get Expert Config"].json }}` instead
3. Key config keys to map:
   - `followup_primeiro_audio_horas` — hours after first contact to send first follow-up
   - `followup_convite_horas` — hours after convite to follow up
   - `followup_aguardando_cadastro_horas` — hours for cadastro reminder
   - `followup_saiu_grupo_horas` — hours to follow up after leaving group
   - `followup_boas_vindas_grupo_horas` — hours for group welcome follow-up
   - `pergunta_entrada_horas` — hours for entry question

#### Step 7: Replace UAZAPI Token Usage

1. Find ALL HTTP Request nodes calling UAZAPI inside the follow-up processing pipeline
2. Replace hardcoded tokens with: `{{ $node["Get Expert Tokens"].json.token }}`
3. If the workflow uses rotation across multiple instances, ensure it cycles through the expert's own instances only

#### Step 8: Replace "Helena" with nome_assistente

1. Search the entire workflow for "Helena"
2. Replace all occurrences with: `{{ $node["Loop Experts"].json.nome_assistente }}`
   - (or `{{ $json.nome_assistente }}` depending on the node's position relative to the loop)
3. Check specifically:
   - Follow-up message templates
   - Audio script text
   - Any personalization fields

#### Step 9: Update Minimax TTS Nodes

1. Find HTTP Request nodes calling Minimax TTS
2. **BEFORE** each Minimax node, add an **IF** node:
   - Condition: `{{ $node["Loop Experts"].json.voice_id }}` is not empty
   - **True:** proceed to audio generation
   - **False:** skip audio, send text-only follow-up
   - Name: **`Has Voice?`**
3. Update Minimax request body:
   ```json
   {
     "model": "speech-2.8-hd",
     "text": "{{ follow_up_text_with_nome_assistente }}",
     "voice_id": "{{ $node[\"Loop Experts\"].json.voice_id }}",
     "voice_setting": {{ $node["Loop Experts"].json.voice_settings }}
   }
   ```

#### Step 10: Update Lead Status Updates

1. Find Supabase UPDATE nodes that modify lead status after follow-up
2. Ensure WHERE clause includes: `AND expert_id = '{{ $json.expert_id }}'`
3. This prevents cross-expert lead contamination

#### Step 11: Connect Loop Back

1. After all processing for one expert completes, connect back to the **Loop Experts** `SplitInBatches` node
2. The SplitInBatches node automatically handles the loop — when all experts are processed, it exits

### Connections After Changes
```
Schedule Trigger → Fetch Active Experts → Loop Experts (SplitInBatches)
  → Get Expert Tokens → Get Expert Config → Get Expert Leads (RPC)
    → [For each lead in this expert's set]:
      → Check Follow-up Timing (using expert's config values)
        → Has Voice?
          → (true) → Minimax TTS (expert voice_id) → UAZAPI Send Audio (expert token)
          → (false) → UAZAPI Send Text (expert token)
        → Update Lead Status (with expert_id in WHERE)
  → Loop back to Loop Experts for next expert
```

### Testing Steps
1. Set the schedule trigger to run immediately (or use "Execute Workflow" button)
2. Verify `Fetch Active Experts` returns all active experts (currently just Allan)
3. Verify `Loop Experts` iterates — for one expert, should loop once
4. Verify `Get Expert Leads` returns only Allan's leads (using the new RPC)
5. Verify `Get Expert Config` returns Allan's follow-up timing configs
6. Verify `Get Expert Tokens` returns Allan's UAZAPI instances
7. Verify follow-up messages use Allan's nome_assistente (not "Helena")
8. Verify audio generation uses Allan's voice_id
9. Add a second test expert (inactive) — verify it is NOT included in the loop
10. Add a second test expert (active, no voice_id) — verify text-only follow-ups

---

## Workflow 3: Envio Mensagem - Saas (7WKSEmy5qfjb2MKu)

### Current State
- **Trigger:** Webhook (receives message send requests from the frontend dashboard)
- **Purpose:** Sends individual or bulk messages from the Mensagens page
- **Trigger type:** POST webhook with message details + `expert_id` (enriched by Plan 05-01)
- **Payload includes:** `expert_id`, `instancia`, `telefone`, `mensagem`, `tipo_envio` (text/audio/image), etc.
- **Issues to fix:**
  - No expert_id validation (any caller could spoof expert_id)
  - Supabase queries not filtered by expert_id
  - UAZAPI tokens may not come from the correct expert
  - "Helena" in message templates
  - Voice_id hardcoded for audio messages
  - Configuracoes not filtered by expert_id

### Changes Required

#### Step 1: Add Expert Validation Node (SECURITY CRITICAL)

1. Open workflow `7WKSEmy5qfjb2MKu` in the n8n editor
2. After the **Webhook trigger**, add a new **Supabase** node:
   ```sql
   SELECT validate_webhook_expert('{{ $json.expert_id }}', '{{ $json.instancia }}')
     AS is_valid
   ```
3. Name: **`Validate Expert`**
4. This calls the existing RPC from Phase 2 to confirm the instance belongs to the claimed expert

#### Step 2: Add Validation Gate

1. After `Validate Expert`, add an **IF** node
2. Condition: `{{ $node["Validate Expert"].json.is_valid }}` equals `true`
3. **True branch:** continues to message processing
4. **False branch:** connects to **Respond to Webhook** with error:
   ```json
   { "success": false, "error": "Instance does not belong to this expert" }
   ```
5. Name: **`Expert Valid?`**

#### Step 3: Resolve Expert Details

1. After the validation passes, add a **Supabase** node:
   ```sql
   SELECT nome_assistente, voice_id, voice_settings
   FROM experts
   WHERE id = '{{ $json.expert_id }}'
   ```
2. Name: **`Get Expert Details`**
3. This retrieves the expert's name, voice settings for message personalization

#### Step 4: Get Expert's UAZAPI Token

1. Add a **Supabase** node to get the specific instance's token:
   ```sql
   SELECT token, numero, telefone_enviou
   FROM whatsapp_rotacao
   WHERE expert_id = '{{ $json.expert_id }}'
     AND instancia = '{{ $json.instancia }}'
     AND ativo = true
   LIMIT 1
   ```
2. Name: **`Get Instance Token`**
3. This ensures the UAZAPI call uses the correct token for the expert's instance

#### Step 5: Filter Lead Queries by Expert

1. Find ALL Supabase SELECT nodes that query the `leads` table
2. Add filter: `AND expert_id = '{{ $json.expert_id }}'`
3. This ensures lead lookups only match within the expert's data

#### Step 6: Filter Configuracoes by Expert

1. Find Supabase nodes reading from `configuracoes`
2. Add filter: `AND expert_id = '{{ $json.expert_id }}'`
3. Key configs: `link_comunidade`, `link_cadastro`, message templates

#### Step 7: Replace UAZAPI Token

1. Find ALL HTTP Request nodes calling UAZAPI
2. Replace hardcoded token with: `{{ $node["Get Instance Token"].json.token }}`
3. Endpoints affected:
   - `/api/messages/send` (text)
   - `/api/messages/sendAudio` (audio)
   - `/api/messages/sendImage` (image)

#### Step 8: Replace "Helena" with nome_assistente

1. Search workflow for "Helena"
2. Replace with: `{{ $node["Get Expert Details"].json.nome_assistente }}`
3. Check:
   - Message body templates
   - Audio script text for TTS
   - Any signature or greeting text

#### Step 9: Update Minimax TTS for Audio Messages

1. Find HTTP Request nodes calling Minimax TTS (for `tipo_envio = 'audio'`)
2. **BEFORE** the Minimax node, add an **IF** node:
   - Condition: `{{ $node["Get Expert Details"].json.voice_id }}` is not empty AND `{{ $json.tipo_envio }}` equals `audio`
   - **True:** proceed to Minimax TTS
   - **False:** skip audio (should not happen since frontend disables audio when no voice_id, but guard anyway)
   - Name: **`Generate Audio?`**
3. Update Minimax body:
   ```json
   {
     "model": "speech-2.8-hd",
     "text": "{{ message_text_with_nome_assistente }}",
     "voice_id": "{{ $node[\"Get Expert Details\"].json.voice_id }}",
     "voice_setting": {{ $node["Get Expert Details"].json.voice_settings }}
   }
   ```

#### Step 10: Update Message Log/Status with Expert ID

1. Find Supabase INSERT/UPDATE nodes that log sent messages (e.g., to `mensagens` table)
2. Add field: `expert_id` = `{{ $json.expert_id }}`
3. Find Supabase UPDATE nodes that update lead status after message
4. Add to WHERE: `AND expert_id = '{{ $json.expert_id }}'`

### Connections After Changes
```
Webhook (with expert_id from frontend) → Validate Expert → Expert Valid?
  → (true) → Get Expert Details → Get Instance Token → Lead Lookup (+ expert_id)
    → tipo_envio routing:
      → "texto" → Build Text (with nome_assistente) → UAZAPI Send Text (expert token) → Update Status
      → "audio" → Generate Audio?
        → (true) → Minimax TTS (expert voice) → UAZAPI Send Audio (expert token) → Update Status
        → (false) → Fallback to text → UAZAPI Send Text → Update Status
      → "imagem" → UAZAPI Send Image (expert token) → Update Status
  → (false) → Respond to Webhook (error: unauthorized)
```

### Testing Steps
1. Trigger from the Mensagens page in the dashboard (as Allan's expert)
2. Verify webhook payload includes `expert_id` (from Plan 05-01 changes)
3. Verify `Validate Expert` returns true for Allan's instance
4. Verify `Get Expert Details` returns Allan's nome_assistente and voice_id
5. Verify `Get Instance Token` returns the correct UAZAPI token
6. Send a text message — verify it uses nome_assistente, not "Helena"
7. Send an audio message — verify Minimax uses Allan's voice_id
8. Test with mismatched expert_id and instancia — should be rejected
9. Test with missing expert_id — should be rejected
10. Verify lead status updates include expert_id in WHERE clause

---

## Post-Migration Verification Checklist

After updating all 3 message workflows, verify end-to-end:

### Expert Resolution
- [ ] **Boas vindas:** expert_id resolved from instance name via whatsapp_rotacao JOIN experts
- [ ] **Follow up:** all active experts fetched and looped via SplitInBatches
- [ ] **Envio Mensagem:** expert_id validated from webhook payload via validate_webhook_expert RPC

### Query Filtering
- [ ] **All leads queries** include `WHERE expert_id = ...`
- [ ] **All configuracoes queries** include `WHERE expert_id = ...`
- [ ] **All message log INSERTs** include `expert_id` field
- [ ] **All lead status UPDATEs** include `AND expert_id = ...` in WHERE

### Token Routing
- [ ] **No hardcoded UAZAPI tokens** remain in any workflow
- [ ] **Boas vindas:** uses token from `Resolve Expert` node
- [ ] **Follow up:** uses tokens from `Get Expert Tokens` node (per-expert in loop)
- [ ] **Envio Mensagem:** uses token from `Get Instance Token` node (validated against expert_id)

### Nome Assistente
- [ ] **No "Helena" strings** remain in any of the 3 workflows
- [ ] **Boas vindas:** uses `{{ $node["Resolve Expert"].json.nome_assistente }}`
- [ ] **Follow up:** uses `{{ $node["Loop Experts"].json.nome_assistente }}`
- [ ] **Envio Mensagem:** uses `{{ $node["Get Expert Details"].json.nome_assistente }}`

### Voice Settings
- [ ] **All Minimax TTS calls** use dynamic voice_id from expert record
- [ ] **IF guard** before each Minimax node — skips audio if voice_id is empty
- [ ] **voice_settings** passed as JSONB (not hardcoded individual values)

### Security
- [ ] **Envio Mensagem** validates expert_id + instancia ownership before processing
- [ ] **Boas vindas** skips unknown instances gracefully (no error, just no-op)
- [ ] **Follow up** only processes active experts
- [ ] **No cross-expert data leakage** in any query

---

## Reference Tables

### Supabase Tables Used

| Table | Key Fields | Usage in Workflows |
|-------|-----------|-------------------|
| `whatsapp_rotacao` | `expert_id`, `instancia`, `token`, `ativo`, `ordem`, `numero`, `telefone_enviou` | Instance registry, token source, expert resolution |
| `experts` | `id`, `nome_assistente`, `voice_id`, `voice_settings`, `ativo` | Expert profile, voice config, name substitution |
| `configuracoes` | `expert_id`, `chave`, `valor` | Per-expert timing configs (followup hours, etc.) |
| `leads` | `expert_id`, `telefone`, `nome`, `status`, timestamps | Lead data, scoped per expert |
| `mensagens` | `expert_id` | Message logging |

### RPCs Used

| RPC | Parameters | Used By | Purpose |
|-----|-----------|---------|---------|
| `buscar_leads_followup_expert` | `p_expert_id UUID` | Follow up workflow | Get leads needing follow-up for one expert |
| `validate_webhook_expert` | `p_expert_id UUID, p_instancia TEXT` | Envio Mensagem workflow | Validate instance belongs to expert |

### Minimax TTS API

| Field | Value |
|-------|-------|
| Endpoint | `POST https://api.minimax.io/v1/t2a_async_v2` |
| Model | `speech-2.8-hd` |
| Auth Header | `Authorization: Bearer {MINIMAX_API_KEY}` |
| Body.voice_id | From `experts.voice_id` |
| Body.voice_setting | From `experts.voice_settings` (JSONB) |

### Node Naming Convention

| Node Name | Type | Used In |
|-----------|------|---------|
| `Resolve Expert` | Supabase SELECT | Boas vindas |
| `Expert Found?` | IF | Boas vindas |
| `Fetch Active Experts` | Supabase SELECT | Follow up |
| `Loop Experts` | SplitInBatches | Follow up |
| `Get Expert Tokens` | Supabase SELECT | Follow up |
| `Get Expert Config` | Supabase SELECT | Follow up |
| `Get Expert Leads` | Supabase RPC | Follow up |
| `Validate Expert` | Supabase RPC | Envio Mensagem |
| `Expert Valid?` | IF | Envio Mensagem |
| `Get Expert Details` | Supabase SELECT | Envio Mensagem |
| `Get Instance Token` | Supabase SELECT | Envio Mensagem |
| `Has Voice?` | IF | All 3 workflows |
| `Generate Audio?` | IF | Envio Mensagem |

---

*Generated: 2026-03-28*
*Phase: 05-whatsapp-n8n-workflows-voice, Plan 02*
