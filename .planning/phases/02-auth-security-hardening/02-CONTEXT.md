# Phase 2: Auth & Security Hardening - Context

**Gathered:** 2026-03-27
**Status:** Ready for planning

<domain>
## Phase Boundary

Role-based authentication (admin vs expert), RLS policies on all 26 tenant tables, session security with 24h expiration, and security hardening (XSS sanitization, CSP headers, secret protection, console.log removal in production). Expert can only see their own data. Admin bypasses RLS for full access and impersonation.

</domain>

<decisions>
## Implementation Decisions

### RLS Strategy
- **D-01:** Use RPC-only access pattern. Frontend calls Supabase RPCs (not direct table queries). RPCs receive expert_id as parameter and validate server-side. RLS policies act as second layer of defense via `set_config` at the start of each RPC.
- **D-02:** Migrate existing direct queries (.from('leads').select()) to RPCs gradually — hook by hook. Direct queries continue working during migration with RLS as fallback filter.
- **D-03:** Admin bypasses RLS via service_role key used internally in admin RPCs. Admin can pass any expert_id to operate on any expert's data.

### Roles & Session Model
- **D-04:** Add `role TEXT DEFAULT 'expert'` and `expert_id UUID REFERENCES experts(id)` columns to `admin_users` table. Admin has role='admin' and expert_id=NULL. Expert has role='expert' and expert_id pointing to their expert record.
- **D-05:** Update `admin_login` RPC to return expanded user object: {id, email, nome, role, expert_id, expert: {cor_primaria, cor_secundaria, logo_url, nome_plataforma, nome_assistente, plano: {nome, max_leads, max_instancias, max_envios_mes, features_permitidas}}}
- **D-06:** authStore stores full user + expert data in localStorage session. Session includes role, expert_id, and complete expert profile for immediate white-label application on login (Phase 4).
- **D-07:** Existing brute force protection (exponential backoff) in authStore is adequate — keep it.

### Secrets & Webhooks
- **D-08:** Webhook URLs in `src/config/webhooks.ts` remain in frontend — they are public endpoints. N8N validates requests via headers.
- **D-09:** UAZAPI tokens (instance tokens, API keys) must be moved server-side. Frontend never sees tokens. RPCs fetch tokens from `whatsapp_rotacao` and make requests to UAZAPI internally.
- **D-10:** Minimax API keys never exposed to frontend. Audio generation happens server-side via RPCs or n8n workflows.

### XSS, CSP & Build Security
- **D-11:** XSS sanitization happens on the backend (RPCs) before writing to database. React already escapes JSX output by default. No DOMPurify needed on frontend.
- **D-12:** CSP headers at basic level via meta tag in index.html: default-src 'self', script-src 'self', style-src 'self' 'unsafe-inline' (required for Tailwind), connect-src for Supabase URL and n8n webhook domains.
- **D-13:** console.log stripped from production builds via Vite esbuild drop config.
- **D-14:** RPCs validate all inputs server-side (type checking, length limits, allowed values) — don't trust frontend validation alone.

### Claude's Discretion
- RLS policy implementation details (exact SQL for each table's policy)
- How to structure the set_config call pattern in RPCs
- Which hooks to migrate to RPCs first (prioritize by security sensitivity)
- Exact CSP directive values for connect-src domains

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Auth System
- `src/stores/authStore.ts` — Current auth store with session management, brute force protection, signIn/signOut
- `src/pages/Login.tsx` — Login page component
- `src/components/ProtectedRoute.tsx` — Route protection with session expiration check

### Supabase Client
- `src/lib/supabase.ts` — Supabase client initialization (anon key)
- `src/backend/client.ts` — Re-exports Supabase client
- `src/backend/env.ts` — Environment variable types

### Security-Sensitive Files
- `src/config/webhooks.ts` — N8N webhook URLs (hardcoded, staying in frontend per D-08)
- `.env.example` — Environment variable template

### Types
- `src/types/database.ts` — Database row/insert types (has expert_id fields from Phase 1)
- `src/types/index.ts` — Lead interface (has expert_id from Phase 1)

### Codebase Maps
- `.planning/codebase/CONCERNS.md` — Security concerns identified during codebase mapping
- `.planning/codebase/ARCHITECTURE.md` — App architecture patterns

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `authStore.ts` — Already has signIn, signOut, session expiration, brute force protection. Needs: role, expert_id, expert profile data added to state.
- `ProtectedRoute.tsx` — Already checks auth. Needs: role-based route protection (/admin only for admin role).
- `admin_login` RPC — Already exists in Supabase. Needs: return expanded user with role + expert data.

### Established Patterns
- Zustand for global state (authStore) — keep this pattern for auth state
- Supabase RPC calls via `supabase.rpc()` — established in authStore.ts line 50
- Direct table queries via `supabase.from().select()` in all hooks — will coexist with RPCs during gradual migration

### Integration Points
- `App.tsx` — Router, needs /admin route with role check
- `Sidebar.tsx` — "Allan Cabral" hardcoded at line 42, needs dynamic user/expert info
- All hooks in `src/hooks/` — Currently use direct queries, will migrate to RPCs gradually
- `vite.config.ts` — Needs esbuild drop config for console.log removal
- `index.html` — Needs CSP meta tag

</code_context>

<specifics>
## Specific Ideas

- Rate limiting already implemented in authStore with exponential backoff (1s/5s/30s) — keep this, don't rebuild
- Allan Cabral's existing admin_users record should be updated to role='admin' (he is the agency admin)
- Create a second admin_users record for Allan as expert (role='expert', expert_id=Allan's expert UUID) for testing
- RLS policies should use `current_setting('app.expert_id', true)` pattern — set via `set_config('app.expert_id', ...)` in RPCs

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 02-auth-security-hardening*
*Context gathered: 2026-03-27*
