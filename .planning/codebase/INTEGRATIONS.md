# External Integrations

**Analysis Date:** 2026-03-27

## APIs & External Services

### Supabase (Backend-as-a-Service)

**Purpose:** Primary database, authentication via RPC, and all data persistence.

- SDK: `@supabase/supabase-js` ^2.97.0
- Client: `src/lib/supabase.ts` (singleton, re-exported via `src/backend/client.ts`)
- Auth env vars: `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`

**Supabase Tables Used (identified from queries):**
- `leads` - Lead records (CRUD operations)
- `envios_massa` - Mass message send records
- `envios_massa_leads` - Individual lead status within mass sends
- `whatsapp_rotacao_mensagens` - WhatsApp message rotation
- `blacklist_grupos` - Group blacklist
- `grupos_ignorar_coleta` - Groups to ignore during collection
- `torneios` - Tournament management
- `greens` - Tournament green counts
- `agendamentos_grupos` - Group scheduling
- `documents` - Copy/content documents with metadata

**Supabase RPCs Used:**
- `admin_login(p_email, p_senha)` - Custom auth login (`src/stores/authStore.ts`)
- `get_metricas_dashboard()` - Dashboard metrics aggregation (`src/hooks/useDashboard.ts`)
- `get_lista_conversas()` - Conversation listing (`src/pages/Conversas.tsx`)
- `listar_grupos_distintos()` - Distinct group listing (`src/pages/Grupos.tsx`)

### n8n Webhooks (Workflow Automation)

**Purpose:** Backend automation for WhatsApp messaging, group management, tournaments, AI copy generation, and moderation.

- Config: `src/config/webhooks.ts`
- HTTP clients: native `fetch` via `fetchWithTimeout()` helper (30s timeout), and `axios`

**Primary n8n Server (n8n-gend):**
- Base: `https://n8n-gend.srv1431760.hstgr.cloud/webhook`
- Endpoints:
  - `/envio-saas` - SaaS message dispatch
  - `/buscar-grupos` - Fetch WhatsApp groups
  - `/buscar-grupos-agendamento` - Fetch groups for scheduling
  - `/cancelar-agendamento` - Cancel scheduled send
  - `/blacklist-remover` - Remove from blacklist
  - `/relatorio-grupo` - Group report generation
  - `/ranking-torneio` - Tournament rankings
  - `/excluir-instancia` - Delete WhatsApp instance
  - `/reconectar` - Reconnect WhatsApp instance
  - `/criar-instancia` - Create WhatsApp instance
  - `/torneio` - Tournament operations
  - `/seguranca` - Security operations
  - `/gerar-copy` - AI-powered copywriting generation
  - `/adicionar-exemplo-copy` - Add copy examples for AI training
  - `/assistente-whatsapp` - WhatsApp AI assistant

**Secondary n8n Server (n8n-easypanel):**
- Base: `https://n8n-n8n.04qisd.easypanel.host/webhook`
- Endpoints:
  - `/teste-mensagem` - Test message sending
  - `/disparo-massa` - Mass message dispatch (overridable via `VITE_N8N_WEBHOOK_URL` env var)

### UAZAPI (WhatsApp API Provider)

**Purpose:** WhatsApp Business API integration for sending/receiving messages.

- Base URL: `https://pedrooberlaender.uazapi.com` (hardcoded in `src/config/webhooks.ts`)
- Used in: `src/pages/Grupos.tsx`, `src/pages/SimuladorEnvios.tsx`
- Interaction pattern: URLs passed as payload to n8n webhooks (n8n proxies the actual UAZAPI calls)

## Data Storage

**Database:**
- Supabase (PostgreSQL)
  - Connection: `VITE_SUPABASE_URL` + `VITE_SUPABASE_ANON_KEY`
  - Client: `@supabase/supabase-js` createClient
  - Access pattern: Direct table queries + RPC calls from browser

**Client-Side Storage:**
- `localStorage` for auth session persistence:
  - Key `dashboard-auth-user`: Serialized user object (JSON)
  - Key `dashboard-auth-timestamp`: Session start timestamp
  - Session duration: 24 hours (`src/stores/authStore.ts`)

**File Storage:**
- Not applicable (no file upload detected)

**Caching:**
- None (no caching layer detected)

## Authentication & Identity

**Auth Provider:** Custom (via Supabase RPC)
- Implementation: `src/stores/authStore.ts` using Zustand store
- Login: Calls `supabase.rpc('admin_login', { p_email, p_senha })` - server-side password validation
- Session: localStorage-based with 24-hour TTL (no JWT/token refresh)
- Route protection: `src/components/ProtectedRoute.tsx`
- Brute force protection: Client-side rate limiting (progressive delays: 1s after 3 attempts, 5s after 5, 30s after 10)
- Does NOT use Supabase Auth (supabase.auth.*) - uses a custom RPC approach

## Monitoring & Observability

**Error Tracking:**
- None (no Sentry, Datadog, or similar detected)

**Logs:**
- `console.error` / `console.log` only (stripped in production via esbuild `drop: ['console', 'debugger']`)

## CI/CD & Deployment

**Hosting:**
- GitHub Pages (static site)
- Build output: `github-pages/` directory
- Custom 404 page: `docs/404.html`
- Jekyll disabled: `docs/.nojekyll`

**CI Pipeline:**
- None detected (no `.github/workflows/` or CI config files found)
- Manual build and deploy process

## Environment Configuration

**Required env vars (from `.env.example`):**
- `VITE_SUPABASE_URL` - Supabase project URL
- `VITE_SUPABASE_ANON_KEY` - Supabase anonymous/public key
- `VITE_N8N_WEBHOOK_URL` - Optional override for mass dispatch webhook URL

**Env file:** `.env` present (contents not read for security)

**Note:** Most webhook URLs and the UAZAPI base URL are hardcoded in `src/config/webhooks.ts`, not environment-driven. Only `VITE_N8N_WEBHOOK_URL` is configurable via env var.

## Content Security Policy

Defined in `index.html` `<meta>` tag:
- `connect-src`: `*.supabase.co`, `wss://*.supabase.co`, both n8n servers, UAZAPI
- `img-src`: self, data, blob, `*.supabase.co`
- `font-src`: self, `fonts.gstatic.com`
- `style-src`: self, unsafe-inline, `fonts.googleapis.com`

## Webhooks & Callbacks

**Incoming:**
- None (this is a frontend-only SPA)

**Outgoing:**
- All n8n webhook endpoints listed above (POST requests with JSON payloads)
- Supabase API calls (queries, RPCs, mutations)

## Integration Architecture

```
Browser (SPA)
  ├── Supabase JS Client ──→ Supabase (PostgreSQL + RPCs)
  ├── fetch/axios ──→ n8n-gend webhooks ──→ WhatsApp (UAZAPI), AI services
  └── fetch/axios ──→ n8n-easypanel webhooks ──→ Mass dispatch
```

The frontend communicates directly with Supabase for data operations and triggers n8n workflows via webhooks for actions that require server-side processing (WhatsApp messaging, AI copy generation, group management). n8n acts as the backend orchestration layer.

---

*Integration audit: 2026-03-27*
