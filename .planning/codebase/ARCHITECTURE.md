# Architecture

**Analysis Date:** 2026-03-27

## Pattern Overview

**Overall:** Single-Page Application (SPA) with client-side routing, deployed as static files to GitHub Pages.

**Key Characteristics:**
- React 19 SPA using HashRouter (hash-based routing for GitHub Pages compatibility)
- Supabase as sole backend (database, auth via RPC, realtime subscriptions)
- N8N webhook-based automation layer for WhatsApp messaging and external actions
- Zustand for global auth state; all other state is local to hooks/components
- No SSR, no server-side logic -- purely client-side rendering
- Dark-themed glassmorphism UI built with Tailwind CSS

## Layers

**Presentation Layer (Pages):**
- Purpose: Full-screen views mapped to routes; compose components and consume hooks
- Location: `src/pages/`
- Contains: 19 page components (Dashboard, Leads, Conversas, Envios, etc.)
- Depends on: hooks, components, utils, types
- Used by: Router in `src/App.tsx`

**Component Layer:**
- Purpose: Reusable UI elements, domain-specific sub-components
- Location: `src/components/`
- Contains: Shared components (MetricCard, PageHeader, Sidebar, Toast, LeadBadge, ProtectedRoute) and domain subdirectories (envios/, mensagens/, agendamentos/, copy/, numeros/)
- Depends on: utils, types, stores (Sidebar uses authStore)
- Used by: Pages

**Data/Hook Layer:**
- Purpose: All data fetching, Supabase queries, realtime subscriptions, and business logic
- Location: `src/hooks/`
- Contains: 16 custom hooks -- each hook owns the data lifecycle for a specific domain
- Depends on: `src/backend/client.ts` (Supabase client), `src/config/webhooks.ts`, `src/types/`
- Used by: Pages

**State Management Layer:**
- Purpose: Global authentication state only
- Location: `src/stores/authStore.ts`
- Contains: Single Zustand store for user session (signIn, signOut, initialize, session expiration)
- Depends on: `src/lib/supabase.ts`
- Used by: ProtectedRoute, Sidebar, Login page

**Backend Client Layer:**
- Purpose: Supabase client initialization and environment config
- Location: `src/lib/supabase.ts` (primary), `src/backend/client.ts` (re-export), `src/backend/env.ts`
- Contains: Supabase client singleton configured with VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY
- Used by: All hooks, authStore

**Configuration Layer:**
- Purpose: Webhook URLs and external service endpoints
- Location: `src/config/webhooks.ts`
- Contains: Centralized N8N webhook URLs (two servers: n8n-gend primary, n8n-easypanel secondary), UAZAPI base URL, fetchWithTimeout helper
- Used by: Hooks that trigger external actions (useEnvioMassa, useGerarCopy, etc.)

**Type Layer:**
- Purpose: TypeScript type definitions matching Supabase schema
- Location: `src/types/`
- Contains: `database.ts` (full Database type with Row/Insert/Update for all tables, Views, Functions), `index.ts` (simpler domain types), `envios.ts` (envio-specific types)
- Used by: All hooks and components

**Utility Layer:**
- Purpose: Pure helper functions
- Location: `src/utils/`
- Contains: `cn.ts` (clsx + tailwind-merge), `formatters.ts` (date/phone/status formatting), `retry.ts` (exponential backoff wrapper)
- Used by: Components, pages, hooks

## Data Flow

**Standard Page Data Flow:**

1. Page component mounts, calls a custom hook (e.g., `useDashboard`, `useLeads`)
2. Hook initializes local state with `useState`, triggers `useEffect` to call Supabase
3. Hook queries Supabase directly via the JS client (`supabase.from('table').select(...)`)
4. Hook subscribes to Supabase Realtime channel for live updates (`postgres_changes`)
5. Hook registers visibility/reconnect refresh via `useVisibilityRefresh`
6. Data returned to page component via hook return value
7. Page renders UI with the data, passes slices to child components via props

**Webhook Action Flow (Envios, Copy Generation, etc.):**

1. User triggers action in UI (e.g., start mass send)
2. Hook writes record to Supabase (e.g., `envios_massa` table)
3. Hook calls N8N webhook via `fetchWithTimeout` with payload
4. N8N processes the action externally (sends WhatsApp messages via UAZAPI)
5. N8N updates Supabase records as it progresses
6. Hook polls Supabase for progress updates (3-second interval)
7. UI reflects real-time progress

**Authentication Flow:**

1. App mounts, calls `useAuthStore.getState().initialize()` in `App` useEffect
2. `initialize()` checks localStorage for cached user + timestamp
3. If session valid (< 24h), sets user in Zustand store
4. If expired or missing, sets user to null
5. `ProtectedRoute` checks store: if no user, redirects to `/login`
6. Login calls `supabase.rpc('admin_login', { p_email, p_senha })` -- custom RPC, not Supabase Auth
7. On success, stores user in localStorage + Zustand store
8. Brute-force protection: progressive delays after failed attempts (1s/5s/30s)

**State Management:**
- Global state: Only auth (Zustand store in `src/stores/authStore.ts`)
- Data state: Local to each hook (useState), no shared data cache
- UI state: Local to page/component (sidebar collapse, mobile menu, filters, pagination)
- No React Context is used (context directory exists but is empty)

## Key Abstractions

**Custom Data Hooks:**
- Purpose: Encapsulate all Supabase queries, realtime subscriptions, and refresh logic per domain
- Examples: `src/hooks/useDashboard.ts`, `src/hooks/useLeads.ts`, `src/hooks/useEnvioMassa.ts`, `src/hooks/useFunil.ts`, `src/hooks/useTemplates.ts`, `src/hooks/useWhatsappRotacao.ts`
- Pattern: Each hook manages its own loading/error/data state, sets up Supabase Realtime channel, registers visibility refresh, and exposes a `refresh`/`refetch` callback

**Database Row Types:**
- Purpose: TypeScript interfaces mirroring every Supabase table, view, and function
- Examples: `src/types/database.ts` (LeadRow, EnvioMassaRow, NotificacaoRow, etc.)
- Pattern: Row type for reads, Insert type (omitting auto-generated fields), Update type (Partial<Insert>)

**Webhook Configuration:**
- Purpose: Centralized external endpoint registry
- Examples: `src/config/webhooks.ts` (WEBHOOKS object with all N8N endpoints)
- Pattern: Const object with named endpoints, used by hooks via `WEBHOOKS.ENVIO_SAAS`, `WEBHOOKS.GERAR_COPY`, etc.

## Entry Points

**Application Entry:**
- Location: `src/main.tsx` (referenced from `index.html`)
- Triggers: Browser loads `index.html`
- Responsibilities: Renders `<App />` into `#root`

**Router / App Shell:**
- Location: `src/App.tsx`
- Triggers: React mount
- Responsibilities: Defines all routes, wraps protected routes in `ProtectedRoute` + `ProtectedLayout`, initializes auth store

**Build Entry (Vite):**
- Location: `vite.config.ts` (default), `vite.config.ghpages.ts` (GitHub Pages variant)
- Triggers: `npm run dev` or `npm run build`
- Responsibilities: Vite config with manual chunk splitting (vendor-react, vendor-supabase, vendor-charts, vendor-utils)

## Routing Structure

All routes use `HashRouter` (hash-based URLs like `/#/dashboard`).

**Public Routes:**
- `/login` -- `src/pages/Login.tsx`

**Protected Routes (wrapped in ProtectedRoute + ProtectedLayout with Sidebar):**
- `/` -- Redirects to `/dashboard`
- `/dashboard` -- `src/pages/Dashboard.tsx`
- `/leads` -- `src/pages/Leads.tsx`
- `/funil` -- `src/pages/Funil.tsx`
- `/conversas` -- `src/pages/Conversas.tsx`
- `/envios` -- `src/pages/Envios.tsx`
- `/envios/simulador` -- `src/pages/SimuladorEnvios.tsx`
- `/envios/historico` -- `src/pages/HistoricoEnvios.tsx`
- `/envios/templates` -- `src/pages/Templates.tsx`
- `/envios/agendamentos` -- `src/pages/Agendamentos.tsx`
- `/envios/agendados` -- `src/pages/Agendados.tsx`
- `/envios/gerar-copy` -- `src/pages/GerarCopy.tsx`
- `/grupos` -- `src/pages/Grupos.tsx`
- `/torneios` -- `src/pages/Torneios.tsx`
- `/mensagens` -- `src/pages/Mensagens.tsx`
- `/central-whatsapp` -- `src/pages/CentralWhatsapp.tsx`
- `/notificacoes` -- `src/pages/Notificacoes.tsx`
- `/configuracoes` -- `src/pages/Configuracoes.tsx`

## Error Handling

**Strategy:** Per-hook try/catch with local error state. No global error boundary.

**Patterns:**
- Each hook maintains its own `error: string | null` state
- Supabase query errors are caught, message extracted, and set to error state
- Stale request protection: hooks use `abortRef` counter to ignore outdated responses (see `src/hooks/useLeads.ts`)
- Webhook failures are logged but do not block the main operation (fire-and-forget pattern in `src/hooks/useEnvioMassa.ts`)
- Timeout protection: `fetchWithTimeout` in `src/config/webhooks.ts` wraps fetch with 30s AbortController timeout
- Dashboard uses `Promise.allSettled` to handle partial failures gracefully (see `src/hooks/useDashboard.ts`)
- Retry utility available at `src/utils/retry.ts` (exponential backoff, max 2 retries)

## Cross-Cutting Concerns

**Logging:** Console-only (`console.error` for error paths). Production builds strip all console/debugger via Vite esbuild config in `vite.config.ts`.

**Validation:** No form validation library. Validation is implicit in Supabase constraints and N8N workflows.

**Authentication:** Custom RPC-based auth via `supabase.rpc('admin_login')`. Session stored in localStorage with 24-hour expiration. Brute-force lockout in Zustand store. Not using Supabase Auth service.

**Realtime Updates:** Most data hooks subscribe to Supabase Realtime `postgres_changes` on their respective tables. Combined with 30-second auto-refresh intervals and visibility/reconnect refresh via `src/hooks/useVisibilityRefresh.ts`.

**Security Headers:** Content-Security-Policy set in `index.html` restricting connections to Supabase, N8N servers, and UAZAPI only.

---

*Architecture analysis: 2026-03-27*
