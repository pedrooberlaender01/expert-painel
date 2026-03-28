# N8N Infrastructure Workflows — Multi-Tenant Migration Guide

**Phase:** 05-whatsapp-n8n-workflows-voice (Plan 03)
**Date:** 2026-03-28
**Purpose:** Step-by-step instructions to update 3 infrastructure n8n workflows for multi-tenant expert_id isolation.

> **Note:** These workflows cannot be edited via MCP tools — they must be manually updated in the n8n editor at `https://n8n-gend.srv1431760.hstgr.cloud`.

---

## Common Pattern: Expert Resolution from Instance

All instance-triggered workflows (Coleta de eventos, identificaConexao) share the same expert resolution pattern. Add this as a **Supabase node** immediately after the webhook trigger:

```sql
SELECT wr.expert_id, wr.token
FROM whatsapp_rotacao wr
WHERE wr.instancia = '{{ $json.instance }}'
  AND wr.ativo = true
LIMIT 1
```

- **Node name:** `Resolve Expert`
- **Node type:** Supabase (Select)
- **Table:** `whatsapp_rotacao`
- **Output:** `expert_id` (UUID) and `token` (UAZAPI token for this instance)

After this node, all subsequent Supabase queries must include `AND expert_id = '{{ $node["Resolve Expert"].json.expert_id }}'`.

UAZAPI API calls must use the token from the resolved instance: `{{ $node["Resolve Expert"].json.token }}` instead of any hardcoded token.

---

## Workflow 4: Coleta de eventos (lysiSML2rdmSsfTG)

### Current State
- **Trigger:** Webhook receiving UAZAPI event payloads (message received, status change, etc.)
- **Purpose:** Collects WhatsApp events and stores them in `whatsapp_eventos_log`
- **Issue:** No expert_id filtering — events from all instances are processed identically

### Changes Required

#### Step 1: Add Expert Resolution Node
1. Open workflow `lysiSML2rdmSsfTG` in the n8n editor
2. Click the connection between the **Webhook trigger** and the first processing node
3. Add a new **Supabase** node between them
4. Configure:
   - **Operation:** Select Rows
   - **Table:** `whatsapp_rotacao`
   - **Filters:** `instancia` equals `{{ $json.instance }}` AND `ativo` equals `true`
   - **Limit:** 1
   - **Return fields:** `expert_id`, `token`
5. Name this node: `Resolve Expert`

#### Step 2: Add Validation (IF node)
1. After `Resolve Expert`, add an **IF** node
2. Condition: `{{ $json.expert_id }}` is not empty
3. **True branch:** continues to event processing
4. **False branch:** connects to a **No Operation** node (unknown instance — skip)
5. Name: `Expert Found?`

#### Step 3: Modify Event Log INSERT
1. Find the Supabase INSERT node that writes to `whatsapp_eventos_log`
2. Add field: `expert_id` = `{{ $node["Resolve Expert"].json.expert_id }}`
3. This ensures every logged event is tagged with the correct expert

#### Step 4: Filter Lead Lookups by Expert
1. Find any Supabase SELECT nodes that query the `leads` table
2. Add filter: `expert_id` equals `{{ $node["Resolve Expert"].json.expert_id }}`
3. This prevents cross-expert lead matching

#### Step 5: Use Instance Token for UAZAPI Calls
1. Find any HTTP Request nodes that call UAZAPI
2. Replace any hardcoded token with: `{{ $node["Resolve Expert"].json.token }}`
3. This ensures each instance uses its own UAZAPI token

### Connections After Changes
```
Webhook → Resolve Expert → Expert Found?
  → (true) → [existing event processing pipeline with expert_id added]
  → (false) → No Operation (skip)
```

### Testing Steps
1. Send a test webhook with a known instance name (e.g., Allan's instance)
2. Verify `Resolve Expert` returns the correct expert_id
3. Check `whatsapp_eventos_log` — new rows should have `expert_id` populated
4. Send a webhook with an unknown instance name — should be skipped gracefully
5. Verify no events are logged for unknown instances

---

## Workflow 5: Rotatividade Numero - Trafego (nnGrV8nXuN58qaX8)

### Current State
- **Trigger:** GET webhook from external traffic links (Instagram bio, Facebook ads)
- **Purpose:** Cycles through WhatsApp numbers for traffic distribution
- **Issue:** No expert scoping — rotation mixes all instances across experts

### CRITICAL DIFFERENCE
This workflow is triggered via **GET webhook** from external traffic links. There is **NO instance name** in the payload — only query parameters.

**Solution:** `expert_id` comes as a **query parameter** in the URL:
- Instagram link: `GET /webhook/whatsapp-rotacao?expert_id={UUID}`
- Facebook link: `GET /webhook/whatsapp-rotacao-facebook?expert_id={UUID}`

### Changes Required

#### Step 1: Extract expert_id from Query Parameter
1. Open workflow `nnGrV8nXuN58qaX8` in the n8n editor
2. The Webhook trigger node should already receive query parameters
3. After the trigger, add a **Set** node to extract and validate:
   - `expert_id` = `{{ $json.query.expert_id }}`
4. Name: `Extract Expert ID`

#### Step 2: Validate Expert Exists and is Active
1. Add a **Supabase** node after `Extract Expert ID`
2. Configure:
   - **Operation:** Select Rows
   - **Table:** `experts`
   - **Filters:** `id` equals `{{ $json.expert_id }}` AND `ativo` equals `true`
   - **Limit:** 1
3. Name: `Validate Expert`

#### Step 3: Add Validation Gate (IF node)
1. After `Validate Expert`, add an **IF** node
2. Condition: `{{ $json.id }}` is not empty
3. **True branch:** continues to rotation logic
4. **False branch:** connects to **Respond to Webhook** with error message
5. Name: `Expert Valid?`

#### Step 4: Filter Rotation Query by Expert
1. Find the Supabase SELECT node that queries `whatsapp_rotacao` for available numbers
2. **Replace** the current query/filters with:
   - **Table:** `whatsapp_rotacao`
   - **Filters:** `expert_id` equals `{{ $node["Extract Expert ID"].json.expert_id }}` AND `ativo` equals `true`
   - **Order by:** `ordem` ASC
3. This ensures only the expert's own instances are in the rotation pool

#### Step 5: Filter Rotation Config by Expert
1. Find any node that reads `whatsapp_rotacao_config`
2. Add filter: `expert_id` equals `{{ $node["Extract Expert ID"].json.expert_id }}`
3. This reads the expert's own rotation settings (delay, mode, etc.)

#### Step 6: Scope Rotation State Updates
1. Find the Supabase UPDATE node that updates rotation state (e.g., incrementing `ordem` or setting `ultimo_uso`)
2. Add `expert_id` to the WHERE clause: `expert_id` equals `{{ $node["Extract Expert ID"].json.expert_id }}`
3. This prevents accidentally updating another expert's rotation state

#### Step 7: Use Selected Instance's Token for UAZAPI
1. Find HTTP Request nodes that call UAZAPI to send the redirect/message
2. Replace any hardcoded token with the token from the selected rotation instance: `{{ $json.token }}`
3. The token comes from the `whatsapp_rotacao` row selected in Step 4

### Connections After Changes
```
Webhook (GET) → Extract Expert ID → Validate Expert → Expert Valid?
  → (true) → Select Rotation Instances (filtered by expert_id) → Rotation Logic → UAZAPI Send (with instance token) → Respond to Webhook
  → (false) → Respond to Webhook (error: expert not found or inactive)
```

### Traffic Links Format
Admin panel shows these links for each expert:

| Link Type | URL |
|-----------|-----|
| Instagram | `https://n8n-gend.srv1431760.hstgr.cloud/webhook/whatsapp-rotacao?expert_id={EXPERT_UUID}` |
| Facebook  | `https://n8n-gend.srv1431760.hstgr.cloud/webhook/whatsapp-rotacao-facebook?expert_id={EXPERT_UUID}` |

These URLs are displayed in the AdminExpertForm.tsx with copy-to-clipboard buttons.

### Testing Steps
1. Get an expert UUID from the Supabase `experts` table
2. Call: `GET https://n8n-gend.srv1431760.hstgr.cloud/webhook/whatsapp-rotacao?expert_id={UUID}`
3. Verify the workflow selects ONLY instances belonging to that expert
4. Verify the rotation cycles through the expert's instances in order
5. Test with an invalid/inactive expert_id — should return error response
6. Test with no expert_id parameter — should return error response
7. Verify UAZAPI calls use the selected instance's own token

---

## Workflow 6: identificaConexao (ySD8VmARp7i5Yqzk)

### Current State
- **Trigger:** Webhook receiving connection status events from UAZAPI
- **Purpose:** Identifies connection status changes (connected, disconnected, QR code needed) and updates `whatsapp_rotacao`
- **Issue:** No expert_id in event logging or status updates

### Changes Required

#### Step 1: Add Expert Resolution Node
1. Open workflow `ySD8VmARp7i5Yqzk` in the n8n editor
2. After the **Webhook trigger**, add a **Supabase** node:
   - **Operation:** Select Rows
   - **Table:** `whatsapp_rotacao`
   - **Filters:** `instancia` equals `{{ $json.instance }}` AND `ativo` equals `true`
   - **Limit:** 1
   - **Return fields:** `expert_id`, `token`, `id`
3. Name: `Resolve Expert`

#### Step 2: Add Validation (IF node)
1. After `Resolve Expert`, add an **IF** node
2. Condition: `{{ $json.expert_id }}` is not empty
3. **True branch:** continues to connection handling
4. **False branch:** connects to **No Operation** (unknown instance — skip)
5. Name: `Expert Found?`

#### Step 3: Scope Connection Status Updates
1. Find the Supabase UPDATE node that modifies `whatsapp_rotacao` (setting connection status)
2. Add `expert_id` to the WHERE clause: ensure update targets `WHERE instancia = '{{ instance }}' AND expert_id = '{{ $node["Resolve Expert"].json.expert_id }}'`
3. This prevents accidentally updating another expert's instance record

#### Step 4: Add Expert to Event Logging
1. Find any Supabase INSERT node that logs to `whatsapp_eventos_log` or similar
2. Add field: `expert_id` = `{{ $node["Resolve Expert"].json.expert_id }}`

#### Step 5: Route Notifications to Correct Expert
1. If the workflow sends any notifications (e.g., "instance disconnected" alerts)
2. Ensure the notification includes the expert_id or is sent only to the relevant expert
3. If notifications go to a general channel, add the expert name for identification

### Connections After Changes
```
Webhook → Resolve Expert → Expert Found?
  → (true) → [existing connection status handling with expert_id added to all queries]
  → (false) → No Operation (skip unknown instance)
```

### Testing Steps
1. Disconnect a known instance belonging to an expert
2. Verify `Resolve Expert` returns the correct expert_id
3. Check `whatsapp_rotacao` — the connection status update should include expert_id in WHERE
4. Check `whatsapp_eventos_log` — connection event should have expert_id
5. Trigger with an unknown instance — should be skipped without errors
6. Verify no cross-expert status contamination

---

## Post-Migration Verification Checklist

After updating all 3 workflows, verify end-to-end:

- [ ] **Coleta de eventos:** Events logged with expert_id; unknown instances skipped
- [ ] **Rotatividade Numero:** Only expert's own instances in rotation pool; invalid expert_id rejected
- [ ] **identificaConexao:** Connection status updates scoped to expert; events logged with expert_id
- [ ] **No hardcoded tokens:** All UAZAPI calls use the instance's own token from whatsapp_rotacao
- [ ] **Cross-expert isolation:** Expert A's traffic link never rotates Expert B's numbers
- [ ] **Backward compatibility:** Allan's existing instances continue working (expert_id already in whatsapp_rotacao)

---

## Reference: Supabase Tables

| Table | Key Fields | Usage |
|-------|-----------|-------|
| `whatsapp_rotacao` | `expert_id`, `instancia`, `token`, `ativo`, `ordem` | Instance registry + rotation pool |
| `whatsapp_rotacao_config` | `expert_id` | Per-expert rotation settings |
| `whatsapp_eventos_log` | `expert_id` | Event audit trail |
| `experts` | `id`, `nome_assistente`, `voice_id`, `ativo` | Expert validation |
| `leads` | `expert_id` | Lead lookup filtering |

---

*Generated: 2026-03-28*
*Phase: 05-whatsapp-n8n-workflows-voice, Plan 03*
