# Codebase Concerns

**Analysis Date:** 2026-03-27

## Tech Debt

**Massive Single-File Components (Critical):**
- Issue: Several page components contain thousands of lines with mixed concerns (types, helpers, sub-components, data fetching, rendering all in one file)
- Files:
  - `src/pages/Grupos.tsx` — 3,670 lines
  - `src/pages/Torneios.tsx` — 2,157 lines
  - `src/pages/Conversas.tsx` — 1,103 lines
  - `src/pages/Leads.tsx` — 1,021 lines
  - `src/pages/Dashboard.tsx` — 835 lines
  - `src/pages/Mensagens.tsx` — 774 lines
- Impact: Extremely difficult to maintain, test, or review. High risk of merge conflicts. Slow IDE performance. Poor separation of concerns.
- Fix approach: Extract sub-components into `src/components/{feature}/` directories. Extract data fetching into dedicated hooks. Extract local types into `src/types/`.

**Inconsistent Supabase Import Paths (High):**
- Issue: The Supabase client is imported via two different paths interchangeably: `../lib/supabase` (direct) and `../backend/client` (re-export). There is no clear rule about which to use.
- Files using `../lib/supabase` directly:
  - `src/stores/authStore.ts`
  - `src/hooks/useModeracao.ts`
  - `src/hooks/useGerarCopy.ts`
  - `src/pages/Grupos.tsx`
  - `src/pages/Torneios.tsx`
- Files using `../backend/client`:
  - `src/hooks/useAgendamentos.ts`, `src/hooks/useDashboard.ts`, `src/hooks/useEnvioMassa.ts`, `src/hooks/useFunil.ts`, `src/hooks/useLeads.ts`, `src/hooks/useMensagensFunil.ts`, `src/hooks/useNotificacoes.ts`, `src/hooks/useTemplates.ts`, `src/hooks/useWhatsappRotacao.ts`, `src/pages/Conversas.tsx`, `src/pages/Leads.tsx`, `src/pages/SimuladorEnvios.tsx`
- Impact: Confusing for developers; if the client configuration changes, both paths must be updated. The `src/backend/client.ts` file is a single re-export line which adds indirection with no value.
- Fix approach: Standardize on one import path. Either remove `src/backend/client.ts` and import from `src/lib/supabase` everywhere, or redirect `src/lib/supabase` through `src/backend/client.ts` and update all imports.

**Duplicate Type Definitions (Medium):**
- Issue: `StatusLead` and `StatusPremium` are defined identically in both `src/types/index.ts` and `src/types/database.ts`. Some files import from `../types` and others from `../types/database`.
- Files:
  - `src/types/index.ts` — defines `StatusLead`, `StatusPremium`, `Lead`, `Notificacao`, `MetricaDiaria`, `User`
  - `src/types/database.ts` — defines `StatusLead`, `StatusPremium` (identical), plus all row types
  - `src/components/LeadBadge.tsx` — imports from `../types`
  - `src/pages/Funil.tsx` — imports from `../types`
  - `src/pages/HistoricoEnvios.tsx` — imports from `../types`
  - `src/hooks/useEnvioMassa.ts` — imports from `../types/database`
- Impact: Types can drift apart silently. Confusing which to import.
- Fix approach: Keep `StatusLead` only in `src/types/database.ts` and re-export from `src/types/index.ts`. Remove the duplicate definition.

**Redundant Status Color/Label Maps (Medium):**
- Issue: Status labels and colors are defined in multiple places independently, with slight variations.
- Files:
  - `src/utils/formatters.ts` — `getStatusLabel()`, `getStatusColor()`
  - `src/pages/Conversas.tsx` — `STATUS_CONFIG` (lines 43-56) with its own label/color map
  - Various page components redefine status rendering inline
- Impact: Adding a new status requires updating multiple files. Easy to miss one location.
- Fix approach: Create a single `src/config/statusConfig.ts` exporting all status metadata (label, color, bg, border) and import everywhere.

**Mock Data Files Still Present (Low):**
- Issue: Mock data files exist but appear unused by any production component (no imports found).
- Files:
  - `src/data/mockData.ts`
  - `src/data/mockHistoricoEnvios.ts`
  - `src/data/mockTemplates.ts`
- Impact: Dead code that increases bundle size and confuses developers.
- Fix approach: Verify no runtime imports exist, then delete the `src/data/` directory.

**Empty Context Directory (Low):**
- Issue: `src/context/` directory exists but is empty — no files inside.
- Files: `src/context/`
- Impact: Confusing directory structure; suggests React Context was planned but never implemented or was removed.
- Fix approach: Delete the empty directory.

## Security Considerations

**API Tokens Fetched to Client and Passed in Requests (Critical):**
- Risk: WhatsApp instance tokens (authentication tokens for the messaging API) are fetched from Supabase directly to the browser and included in webhook POST bodies. Any user with browser DevTools can extract these tokens to control WhatsApp instances.
- Files:
  - `src/hooks/useAgendamentos.ts` — `.select('id, nome, numero, instancia, token, status_conexao')` (line 418)
  - `src/hooks/useModeracao.ts` — `.select('id, nome, numero, instancia, token')` (line 291)
  - `src/pages/Conversas.tsx` — `.select('numero, token, instancia')` (line 442)
  - `src/pages/Torneios.tsx` — `.select('id, nome, numero, instancia, token, ativo')` (line 425)
  - `src/pages/Grupos.tsx` — `.select('id, nome, numero, instancia, token')` (lines 1623, 1986)
  - `src/pages/SimuladorEnvios.tsx` — `.select('id, nome, instancia, token, tipo, status_conexao, numero')` (line 170)
- Current mitigation: App is behind login; Supabase uses anon key with presumably RLS.
- Recommendations: Move webhook calls to server-side (n8n workflows or edge functions) so tokens never reach the browser. Use Supabase RLS to exclude the `token` column from client queries.

**Hardcoded Webhook URLs (High):**
- Risk: N8N server hostnames and full webhook paths are hardcoded in the frontend bundle, visible to anyone inspecting the deployed JS. An attacker could call these webhooks directly (e.g., trigger mass message sends, create/delete WhatsApp instances).
- Files: `src/config/webhooks.ts` — all webhook URLs hardcoded (lines 5-31)
- Current mitigation: None visible. Webhooks appear to accept unauthenticated requests.
- Recommendations: Add authentication headers to webhook calls. Move sensitive webhooks (ENVIO_SAAS, EXCLUIR_INSTANCIA, CRIAR_INSTANCIA) behind server-side proxy.

**Third-Party API Base URL Exposed (Medium):**
- Risk: `UAZAPI_BASE_URL` with a personalized subdomain is hardcoded in `src/config/webhooks.ts` (line 31).
- Files: `src/config/webhooks.ts`
- Current mitigation: None.
- Recommendations: Move to environment variable.

**LocalStorage-Based Auth Without Server Validation (High):**
- Risk: Authentication state is stored in `localStorage` as a plain JSON object. Session validity is checked only by comparing a client-side timestamp. There is no server-side session token or JWT — the app trusts whatever is in localStorage. A user could manually set `dashboard-auth-user` in localStorage to bypass login.
- Files: `src/stores/authStore.ts` — `initialize()` (lines 98-121), `signIn()` stores user to localStorage (line 58)
- Current mitigation: Brute-force delay on login attempts (client-side only, easily bypassed).
- Recommendations: Use Supabase Auth (proper JWT sessions) instead of a custom `admin_login` RPC. Store session tokens, not user objects.

**Supabase Anon Key in Client (Medium):**
- Risk: The Supabase anon key is exposed in the browser bundle (standard for Supabase client apps, but requires strong RLS policies).
- Files: `src/lib/supabase.ts`, `src/backend/env.ts`
- Current mitigation: Presumably RLS policies are configured on Supabase.
- Recommendations: Audit all Supabase RLS policies to ensure the anon key cannot access sensitive data (especially the `token` column on WhatsApp instances table).

## Performance Concerns

**Large Unminified JS Bundle (High):**
- Problem: The main application bundle (`index-D71Gzq3u.js`) is 816KB (uncompressed). The total JS payload is ~1.4MB across all chunks.
- Files: `docs/assets/index-D71Gzq3u.js` (816KB), `docs/assets/vendor-charts-DWZ7qO3g.js` (328KB), `docs/assets/vendor-supabase-Dq-Jb853.js` (172KB)
- Cause: No code splitting beyond manual vendor chunks. All 18+ pages are eagerly loaded in the main bundle. `recharts` (328KB) is loaded even for pages that do not use charts.
- Improvement path: Use `React.lazy()` + `Suspense` for route-level code splitting. Lazy-load `recharts` only on Dashboard/pages that use charts.

**No Image Optimization (Low):**
- Problem: SVG asset (`Assinatura-A-DnK7nPDG.svg`, 35KB) is included in build output. No image optimization pipeline.
- Files: `docs/assets/Assinatura-A-DnK7nPDG.svg`
- Improvement path: Consider inlining small SVGs or using `vite-plugin-svgr`.

**Polling Instead of Realtime (Medium):**
- Problem: `useEnvioMassa.ts` uses `setInterval` polling every 3 seconds to check send progress. This creates unnecessary network traffic and database load.
- Files: `src/hooks/useEnvioMassa.ts` — `startPolling()` (lines 91-165)
- Improvement path: Use Supabase Realtime subscriptions to listen for row changes on `envios_massa` and `envios_massa_leads` tables.

**30 useEffect/useMemo/useCallback Hooks in Single File (Medium):**
- Problem: `src/pages/Grupos.tsx` contains 30 hook calls (useEffect, useMemo, useCallback), indicating excessive complexity and likely unnecessary re-renders.
- Files: `src/pages/Grupos.tsx`
- Improvement path: Break into smaller components with focused state management.

## Accessibility Gaps

**Minimal ARIA Attributes (High):**
- Problem: Only 15 total `aria-*`, `role=`, or `alt=` attributes found across the entire codebase (25,600+ lines). Most interactive elements lack accessible labels.
- Files: Essentially all components under `src/components/` and `src/pages/`
- Impact: Screen reader users cannot navigate or use the application. Fails WCAG 2.1 Level A.
- Fix approach: Add `aria-label` to icon-only buttons, `role` attributes to custom widgets, `alt` text to images, semantic HTML elements (`<nav>`, `<main>`, `<header>`).

**No Keyboard Navigation Support (Medium):**
- Problem: Custom dropdowns, modals, and interactive elements do not implement keyboard event handlers (no `onKeyDown`, no focus management).
- Files: All modal and dropdown components
- Fix approach: Add keyboard handlers, focus trapping in modals, `tabIndex` management.

## Code Duplication

**WhatsApp Instance Management Repeated Across Pages (High):**
- Issue: Instance listing, connection status display, reconnection logic, and instance CRUD are implemented independently in multiple pages.
- Files:
  - `src/pages/Grupos.tsx` — instance fetching + InstanciaCard usage
  - `src/pages/Torneios.tsx` — instance fetching + InstanciaCard usage
  - `src/pages/CentralWhatsapp.tsx` — instance management
  - `src/hooks/useWhatsappRotacao.ts` — shared hook (but pages also do direct Supabase calls)
- Impact: Bug fixes must be applied in multiple places. Inconsistent behavior between pages.
- Fix approach: Consolidate all instance management into `useWhatsappRotacao` hook and ensure all pages use it exclusively.

**Status Configuration Repeated (Medium):**
- Issue: Status labels, colors, and badge styling are defined in at least 3 separate locations.
- Files: `src/utils/formatters.ts`, `src/pages/Conversas.tsx` (STATUS_CONFIG), `src/components/LeadBadge.tsx`
- Fix approach: Single source of truth in `src/config/statusConfig.ts`.

## Missing Error Handling

**Silent Error Swallowing (High):**
- Issue: 108 catch blocks across 33 files, but many only `console.error` and continue silently. Users receive no feedback when operations fail. Production builds strip `console.*` calls (`esbuild.drop` in vite config), so even error logging disappears.
- Files: All hooks in `src/hooks/`, all pages in `src/pages/`
- Impact: Users perform actions (send messages, create instances, save configurations) that silently fail with no UI feedback.
- Fix approach: Implement a global toast/notification system for error feedback. The `useToast` hook exists but is not used in all hooks — integrate it consistently.

**Webhook Failures Silently Ignored (High):**
- Issue: Webhook calls catch errors and only `console.error` them. The comment in `useEnvioMassa.ts` line 276 explicitly says "Nao falha o envio — n8n pode estar offline" — meaning the system proceeds as if the operation succeeded even when the backend is unreachable.
- Files: `src/hooks/useEnvioMassa.ts` (line 274-277), `src/config/webhooks.ts`
- Impact: Users believe mass sends are happening when the n8n backend might be down.
- Fix approach: Show a warning toast when webhooks fail. Add health-check endpoint.

## Dependency Risks

**No Lock on Major Versions (Medium):**
- Risk: All dependencies use caret ranges (`^`), which allows automatic minor/patch updates. React 19, React Router 7, and Recharts 3 are all recent major versions that may receive breaking changes.
- Files: `package.json`
- Impact: `npm install` on different machines/dates could produce different builds.
- Fix approach: Use exact versions or ensure `package-lock.json` is committed and used consistently.

**Axios Included but Underused (Low):**
- Risk: `axios` (bundled in vendor-utils) is imported but the codebase primarily uses `fetch` via `fetchWithTimeout`. Only `src/hooks/useWhatsappRotacao.ts` imports axios.
- Files: `src/hooks/useWhatsappRotacao.ts` (line 3), `package.json`
- Impact: Unnecessary bundle bloat (~13KB gzipped).
- Fix approach: Replace the single axios usage with `fetchWithTimeout` and remove the dependency.

## Scalability Issues

**Unbounded Supabase Queries (High):**
- Problem: Multiple data-fetching hooks call `.select('*')` or large selects without `.limit()`. As the leads table grows, queries will return increasingly large result sets.
- Files: `src/hooks/useDashboard.ts`, `src/hooks/useLeads.ts`, `src/hooks/useFunil.ts`, `src/hooks/useMensagensFunil.ts`
- Impact: Slow page loads, excessive memory usage, potential Supabase rate limiting.
- Fix approach: Add pagination (`.range()`) to all list queries. Implement server-side aggregation for dashboard metrics.

**All Routes Eagerly Loaded (Medium):**
- Problem: All 18 page components are imported at the top of `src/App.tsx` and bundled together. No lazy loading.
- Files: `src/App.tsx` (lines 1-23)
- Impact: Initial page load downloads and parses all page code regardless of which page the user visits.
- Fix approach: Use `React.lazy()` for each route component.

## Test Coverage Gaps

**Zero Test Files (Critical):**
- What's not tested: The entire application. No test files (`.test.*`, `.spec.*`), no test framework configured (no jest.config, no vitest.config), no test script in `package.json`.
- Files: Entire `src/` directory
- Risk: Any change can break existing functionality with no automated detection. Refactoring the large page components is extremely risky without tests.
- Priority: High — at minimum, add integration tests for critical flows (auth, mass send, webhook calls) and unit tests for utility functions in `src/utils/`.

## Configuration Issues

**Build Output Committed to Git (Medium):**
- Issue: The `docs/` directory contains production build artifacts that are tracked in git. Multiple build outputs exist (`docs/`, `github-pages/`) suggesting confusion about the deployment target.
- Files: `docs/assets/*`, `github-pages/` (referenced in `vite.config.ts` as `outDir`)
- Impact: Repository bloat, merge conflicts on build artifacts, stale artifacts if build step is forgotten.
- Fix approach: Add `docs/` and `github-pages/` to `.gitignore`. Use CI/CD (GitHub Actions) to build and deploy to GitHub Pages automatically.

**Sourcemaps Disabled (Low):**
- Issue: `sourcemap: false` in `vite.config.ts`. This makes debugging production issues harder.
- Files: `vite.config.ts` (line 10)
- Impact: Cannot trace production errors back to source code.
- Fix approach: Generate sourcemaps but upload them to an error tracking service (Sentry) rather than serving them publicly.

---

*Concerns audit: 2026-03-27*
