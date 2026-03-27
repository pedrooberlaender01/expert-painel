<!-- GSD:project-start source:PROJECT.md -->
## Project

**Dashboard Leads — Multi-Tenant White-Label Platform**

Plataforma SaaS multi-tenant white-label que permite a uma agência de automação gerenciar 5-15 experts independentes. Cada expert tem seu painel personalizado (cor, logo, persona, voz clonada) para captação e conversão de leads via WhatsApp, com funil automatizado, torneios, moderação de grupos e agendamento de mensagens em massa. Evolução do sistema single-tenant existente (1 expert: Allan Cabral) para plataforma multi-tenant com isolamento por `expert_id`.

**Core Value:** Isolamento seguro de dados entre experts — um expert NUNCA pode ver, modificar ou interagir com dados de outro expert, enquanto a agência (admin master) tem visibilidade e controle total sobre todos.

### Constraints

- **Tech Stack:** Manter React 19 + Vite + Tailwind + Supabase + n8n — não trocar stack
- **Database:** Mesmo projeto Supabase (`albdkqpvoyfhziozgwlk`) com coluna `expert_id`
- **N8N:** Mesmo servidor n8n com workflows compartilhados filtrados por `expert_id`
- **Auth:** Manter auth customizada (não migrar para Supabase Auth)
- **Domínio:** Mesmo domínio para todos experts (diferencia pelo login)
- **Abordagem:** Incremental — sistema deve continuar funcionando durante migração
- **Segurança:** Cybersecurity-first — RLS real, sanitização XSS, sem secrets no frontend, rate limiting
- **Design:** Layout/estrutura 100% idênticos entre experts — apenas cor, logo, nome e persona mudam
- **CSS Variables:** White-label implementado via --color-primary sobrescrito no login
- **Superfícies:** Cores fixas (#0a0a0a fundo, #1a1a1a cards, #232328 borders) para todos experts
<!-- GSD:project-end -->

<!-- GSD:stack-start source:codebase/STACK.md -->
## Technology Stack

## Languages
- TypeScript ^5.8.3 - All application source code (`src/**/*.ts`, `src/**/*.tsx`)
- TSX (React JSX) - UI components and pages
- JavaScript - Configuration files (`vite.config.ts`, `tailwind.config.js`, `postcss.config.js`, `eslint.config.js`)
- HTML - Entry point (`index.html`)
- CSS - Styles (`src/index.css`) with Tailwind directives
## Runtime
- Browser (SPA) - No server-side runtime
- Node.js - Development tooling only (Vite dev server, ESLint, TypeScript compiler)
- npm - `package-lock.json` present
- Lockfile: present
## Frameworks
- React ^19.1.0 - UI framework
- React DOM ^19.1.0 - DOM rendering
- React Router DOM ^7.13.0 - Client-side routing
- Zustand ^5.0.5 - State management (stores in `src/stores/`)
- Tailwind CSS ^3.4.1 - Utility-first CSS framework
- PostCSS ^8.4.35 - CSS processing pipeline
- Autoprefixer ^10.4.21 - Vendor prefixing
- clsx ^2.1.1 - Conditional class name joining
- tailwind-merge ^3.4.0 - Tailwind class conflict resolution
- Vite ^6.3.5 - Build tool and dev server
- @vitejs/plugin-react ^4.5.0 - React Fast Refresh and JSX transform
- esbuild (via Vite) - Transpilation and minification
## Key Dependencies
- `@supabase/supabase-js` ^2.97.0 - Database client and backend-as-a-service SDK. Used for all data operations (queries, RPCs, inserts, updates, deletes)
- `zustand` ^5.0.5 - Global state management. Auth store at `src/stores/authStore.ts`
- `react-router-dom` ^7.13.0 - All page routing and navigation
- `axios` ^1.9.0 - HTTP client for webhook calls (used alongside native `fetch`)
- `recharts` ^3.7.0 - Dashboard charts and data visualization
- `lucide-react` ^0.511.0 - Icon library (excluded from Vite optimizeDeps)
- `date-fns` ^4.1.0 - Date formatting and manipulation
- `clsx` ^2.1.1 + `tailwind-merge` ^3.4.0 - Class name utilities
## TypeScript Configuration
- `strict: true`
- `noUnusedLocals: true`
- `noUnusedParameters: true`
- `noFallthroughCasesInSwitch: true`
- `tsconfig.json` - Root config (references app + node configs)
- `tsconfig.app.json` - Application source config (includes `src/`)
- `tsconfig.node.json` - Node tooling config
## Linting
- Config: `eslint.config.js`
- Plugins: `typescript-eslint` ^8.32.1, `eslint-plugin-react-hooks` ^5.2.0, `eslint-plugin-react-refresh` ^0.4.20, `eslint-plugin-import` ^2.32.0
- Key Rules:
- Ignores: `github-pages/`, `dist/`, `node_modules/`
## Build Configuration
- Base path: `./` (relative)
- Output dir: `github-pages/`
- Sourcemaps: disabled in production
- Console/debugger statements: stripped via esbuild `drop`
- Manual chunks for code splitting:
- Separate config: `vite.config.ghpages.ts` (referenced in `build:ghpages` script)
- Output: `github-pages/` directory
## Scripts
## Tailwind Theme
- Dark theme by default (surface colors start at `#0a0a0f`)
- Custom color tokens: `surface`, `accent`, `teal`, `txt`, `glass`
- Custom fonts: Inter, Outfit (display/body), JetBrains Mono (monospace)
- Custom animations: fade-in, slide-up, slide-in-right, glow-pulse, shimmer, breathe, float, border-flow
- Background patterns: noise, grid-pattern, mesh-gradient
## Platform Requirements
- Node.js (version not pinned - no `.nvmrc`)
- npm for package management
- Static file hosting (GitHub Pages)
- No server-side runtime required
<!-- GSD:stack-end -->

<!-- GSD:conventions-start source:CONVENTIONS.md -->
## Conventions

## Naming Patterns
- Pages: PascalCase matching the route concept, e.g. `src/pages/Dashboard.tsx`, `src/pages/CentralWhatsapp.tsx`, `src/pages/GerarCopy.tsx`
- Components: PascalCase, e.g. `src/components/MetricCard.tsx`, `src/components/PageHeader.tsx`
- Components in feature subdirectories: `src/components/envios/TemplateCard.tsx`, `src/components/agendamentos/AgendamentoCard.tsx`
- Hooks: camelCase prefixed with `use`, e.g. `src/hooks/useLeads.ts`, `src/hooks/useDashboard.ts`
- Stores: camelCase suffixed with `Store`, e.g. `src/stores/authStore.ts`
- Types: camelCase for the file, e.g. `src/types/database.ts`, `src/types/envios.ts`, `src/types/index.ts`
- Utilities: camelCase, e.g. `src/utils/formatters.ts`, `src/utils/cn.ts`, `src/utils/retry.ts`
- Config: camelCase, e.g. `src/config/webhooks.ts`
- Use camelCase for all functions: `fetchLeads`, `iniciarEnvio`, `formatTelefone`, `getStatusLabel`
- Helper/private functions: camelCase, e.g. `formatLocalDate`, `parseTimestamp`, `getDelayMs`
- Exported hook functions: `useLeads`, `useDashboard`, `useToast`
- Portuguese naming is prevalent throughout business logic: `cancelar`, `resetar`, `deriveMetricas`
- camelCase for local variables: `loadingLeads`, `envioId`, `pollingRef`
- UPPER_SNAKE_CASE for module-level constants: `AUTO_REFRESH_MS`, `AUTH_KEY`, `SESSION_DURATION_MS`, `WEBHOOK_URL`
- Database field names use snake_case (matching Supabase schema): `data_primeiro_contato`, `status_envio`
- PascalCase for types and interfaces: `LeadRow`, `DashboardMetricas`, `EnvioProgresso`
- Suffix `Row` for database row types: `LeadRow`, `NotificacaoRow`, `EnvioMassaRow`
- Suffix `Insert` / `Update` for mutation types: `LeadInsert`, `LeadUpdate`
- Suffix `Props` for component props: `MetricCardProps`, `PageHeaderProps`, `SidebarProps`
- Suffix `Return` for hook return types: `UseLeadsReturn`, `UseDashboardReturn`
- Suffix `Params` for hook parameter types: `UseLeadsParams`, `FetchLeadsParams`
- Use `type` keyword for union types and simple aliases, `interface` for object shapes
## Code Style
- No Prettier configured (no `.prettierrc` file)
- 2-space indentation (inferred from all source files)
- Single quotes for strings in TypeScript/JSX
- Semicolons used consistently
- Trailing commas in function parameters and object literals
- ESLint 9 with flat config at `eslint.config.js`
- TypeScript ESLint recommended rules enabled
- `@typescript-eslint/no-explicit-any` is **disabled** (`"off"`) -- `any` is used freely in catch blocks and data transformations
- `no-empty` is **disabled**
- React Hooks plugin enabled
- Run via: `npm run lint`
- Strict mode enabled (`strict: true` in `tsconfig.app.json`)
- `noUnusedLocals: true`, `noUnusedParameters: true`
- Target: ES2020
- JSX: react-jsx (automatic runtime)
- Module resolution: bundler mode
- `noEmit: true` (Vite handles bundling)
## Language
- UI text, comments, and variable names heavily use **Portuguese (Brazilian)**
- Examples: `Carregando...`, `Erro ao carregar leads`, `Muitas tentativas. Aguarde`
- Database column names are in Portuguese: `telefone`, `nome`, `data_primeiro_contato`
- Some English is used for technical concepts: `loading`, `error`, `refetch`, `callback`
- New code should follow this bilingual pattern: Portuguese for domain/UI, English for technical/framework terms
## Import Organization
- No path aliases configured. All imports use relative paths (`../`, `./`)
- Use `import type { X }` for type-only imports (observed in hooks and pages):
## Component Patterns
- Named exports for most components: `export const MetricCard: React.FC<Props> = ...`
- Named exports with `function` for some: `export function ProtectedRoute({ children }: ...)`
- Default exports for some pages: `export default App`, `export default Conversas`, `export default GerarCopy`
- **Recommendation:** Use named exports for components. Default exports appear only on `App.tsx` and a few pages that were added later.
- `React.FC<Props>` pattern for most components: `export const Sidebar: React.FC<SidebarProps> = ...`
- Some components use inline destructured props without `React.FC`
- Props interfaces defined directly above the component in the same file
- Small helper components (e.g. `Sparkline` in `src/components/MetricCard.tsx`, `DayPicker` in `src/pages/Dashboard.tsx`) are defined in the same file
- Larger feature components get their own file in a feature subdirectory
- `useState` for all local UI state
- `useCallback` wrapping all async data-fetching functions
- `useEffect` for side effects (data loading, realtime subscriptions, cleanup)
- `useRef` for abort controllers, polling intervals, DOM refs
- Custom hooks return objects (not arrays): `{ leads, total, loading, error, refetch }`
## State Management
- Only one store: `src/stores/authStore.ts` using `create<AuthState>()`
- Auth state managed via Zustand with localStorage persistence (manual, not middleware)
- Access pattern: `useAuthStore()` hook in components, `useAuthStore.getState()` outside React
- All page-level and component-level state uses `useState`
- No global state management beyond auth -- data fetching is per-page via custom hooks
- Custom hooks per data domain: `useLeads`, `useDashboard`, `useEnvioMassa`, etc.
- Each hook manages its own `loading`, `error`, `data` state
- Supabase client called directly inside hooks (no abstraction layer)
- Realtime subscriptions set up inside hooks via `supabase.channel()`
- Auto-refresh via `setInterval` in some hooks (e.g., `useDashboard` at 30s)
- Visibility-based refresh via `useVisibilityRefresh` hook
- Race condition protection via `useRef` abort counters (see `src/hooks/useLeads.ts` line 42)
## Error Handling
- try/catch in all async operations inside hooks
- Errors stored in state: `setError(err.message || 'Fallback message')`
- `console.error()` for logging (no external error tracking)
- Catch blocks typed as `catch (err: any)` in most places (ESLint `no-explicit-any` is off)
- Some newer code uses `catch (err: unknown)` with type narrowing (see `src/stores/authStore.ts` line 73)
- Non-critical errors (e.g., webhook failures) are caught and logged but do not block the main flow
- `Promise.allSettled` used for parallel fetches where partial failure is acceptable (see `src/hooks/useDashboard.ts`)
- Use `catch (err: unknown)` and narrow with `err instanceof Error`
- Always provide a fallback error message in Portuguese
- Use `Promise.allSettled` when multiple independent fetches can partially fail
## Logging
- `console.error('Descriptive message in Portuguese:', err)` in catch blocks
- Production build strips all console statements via `esbuild.drop: ['console', 'debugger']` in `vite.config.ts`
- No structured logging or external logging service
## CSS / Styling Approach
- Dark theme only (no light mode)
- Custom color tokens: `surface-*`, `accent-*`, `teal-*`, `txt-*`, `glass-*`
- Custom font families: `font-display` (Inter/Outfit), `font-mono` (JetBrains Mono)
- Custom animations: `fade-in`, `slide-up`, `slide-in-right`, `glow-pulse`, `shimmer`, `breathe`, `float`
- `.glass-card` - primary card style with backdrop blur
- `.card-glass` - alias of glass-card
- `.card-dark` - legacy alias mapped to same glass style
- `.card-dark-elevated` - elevated variant with stronger shadow
- `.inner-item` - for nested list items
- `.sidebar-glass` - sidebar-specific glass variant
- Heavily used for dynamic colors, rgba values, and hover states
- Pattern: `style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.04)' }}`
- onMouseEnter/onMouseLeave handlers for hover effects (see `src/components/PageHeader.tsx`)
- `cn()` from `src/utils/cn.ts` combines `clsx` + `tailwind-merge` for conditional class merging
- Use `cn()` for all conditional Tailwind classes
- Mobile-first with `md:` breakpoint for desktop
- Mobile sidebar uses overlay pattern with portal-like approach
- Responsive padding: `p-3 sm:p-4 md:p-6 lg:p-8`
## Comments
- Section separators using line comments: `// --- Types ---`, `// --- Fetch helpers ---`, `// --- Hook ---`
- Decorative headers: `// ─── Period Selector Types ───`
- Inline explanations for non-obvious logic in Portuguese or English
- JSDoc-style comments on utility functions (see `src/hooks/useVisibilityRefresh.ts`, `src/utils/retry.ts`)
- Used sparingly, only on shared utility functions
- Not used on components or hooks
## Module Design
- One primary export per file (component, hook, or store)
- Helper types co-exported from hook files when tightly coupled
- Re-exports used in `src/backend/client.ts` (re-exports `supabase` from `../lib/supabase`)
- `src/types/index.ts` acts as a barrel for shared domain types
- No other barrel files -- all imports are direct file paths
<!-- GSD:conventions-end -->

<!-- GSD:architecture-start source:ARCHITECTURE.md -->
## Architecture

## Pattern Overview
- React 19 SPA using HashRouter (hash-based routing for GitHub Pages compatibility)
- Supabase as sole backend (database, auth via RPC, realtime subscriptions)
- N8N webhook-based automation layer for WhatsApp messaging and external actions
- Zustand for global auth state; all other state is local to hooks/components
- No SSR, no server-side logic -- purely client-side rendering
- Dark-themed glassmorphism UI built with Tailwind CSS
## Layers
- Purpose: Full-screen views mapped to routes; compose components and consume hooks
- Location: `src/pages/`
- Contains: 19 page components (Dashboard, Leads, Conversas, Envios, etc.)
- Depends on: hooks, components, utils, types
- Used by: Router in `src/App.tsx`
- Purpose: Reusable UI elements, domain-specific sub-components
- Location: `src/components/`
- Contains: Shared components (MetricCard, PageHeader, Sidebar, Toast, LeadBadge, ProtectedRoute) and domain subdirectories (envios/, mensagens/, agendamentos/, copy/, numeros/)
- Depends on: utils, types, stores (Sidebar uses authStore)
- Used by: Pages
- Purpose: All data fetching, Supabase queries, realtime subscriptions, and business logic
- Location: `src/hooks/`
- Contains: 16 custom hooks -- each hook owns the data lifecycle for a specific domain
- Depends on: `src/backend/client.ts` (Supabase client), `src/config/webhooks.ts`, `src/types/`
- Used by: Pages
- Purpose: Global authentication state only
- Location: `src/stores/authStore.ts`
- Contains: Single Zustand store for user session (signIn, signOut, initialize, session expiration)
- Depends on: `src/lib/supabase.ts`
- Used by: ProtectedRoute, Sidebar, Login page
- Purpose: Supabase client initialization and environment config
- Location: `src/lib/supabase.ts` (primary), `src/backend/client.ts` (re-export), `src/backend/env.ts`
- Contains: Supabase client singleton configured with VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY
- Used by: All hooks, authStore
- Purpose: Webhook URLs and external service endpoints
- Location: `src/config/webhooks.ts`
- Contains: Centralized N8N webhook URLs (two servers: n8n-gend primary, n8n-easypanel secondary), UAZAPI base URL, fetchWithTimeout helper
- Used by: Hooks that trigger external actions (useEnvioMassa, useGerarCopy, etc.)
- Purpose: TypeScript type definitions matching Supabase schema
- Location: `src/types/`
- Contains: `database.ts` (full Database type with Row/Insert/Update for all tables, Views, Functions), `index.ts` (simpler domain types), `envios.ts` (envio-specific types)
- Used by: All hooks and components
- Purpose: Pure helper functions
- Location: `src/utils/`
- Contains: `cn.ts` (clsx + tailwind-merge), `formatters.ts` (date/phone/status formatting), `retry.ts` (exponential backoff wrapper)
- Used by: Components, pages, hooks
## Data Flow
- Global state: Only auth (Zustand store in `src/stores/authStore.ts`)
- Data state: Local to each hook (useState), no shared data cache
- UI state: Local to page/component (sidebar collapse, mobile menu, filters, pagination)
- No React Context is used (context directory exists but is empty)
## Key Abstractions
- Purpose: Encapsulate all Supabase queries, realtime subscriptions, and refresh logic per domain
- Examples: `src/hooks/useDashboard.ts`, `src/hooks/useLeads.ts`, `src/hooks/useEnvioMassa.ts`, `src/hooks/useFunil.ts`, `src/hooks/useTemplates.ts`, `src/hooks/useWhatsappRotacao.ts`
- Pattern: Each hook manages its own loading/error/data state, sets up Supabase Realtime channel, registers visibility refresh, and exposes a `refresh`/`refetch` callback
- Purpose: TypeScript interfaces mirroring every Supabase table, view, and function
- Examples: `src/types/database.ts` (LeadRow, EnvioMassaRow, NotificacaoRow, etc.)
- Pattern: Row type for reads, Insert type (omitting auto-generated fields), Update type (Partial<Insert>)
- Purpose: Centralized external endpoint registry
- Examples: `src/config/webhooks.ts` (WEBHOOKS object with all N8N endpoints)
- Pattern: Const object with named endpoints, used by hooks via `WEBHOOKS.ENVIO_SAAS`, `WEBHOOKS.GERAR_COPY`, etc.
## Entry Points
- Location: `src/main.tsx` (referenced from `index.html`)
- Triggers: Browser loads `index.html`
- Responsibilities: Renders `<App />` into `#root`
- Location: `src/App.tsx`
- Triggers: React mount
- Responsibilities: Defines all routes, wraps protected routes in `ProtectedRoute` + `ProtectedLayout`, initializes auth store
- Location: `vite.config.ts` (default), `vite.config.ghpages.ts` (GitHub Pages variant)
- Triggers: `npm run dev` or `npm run build`
- Responsibilities: Vite config with manual chunk splitting (vendor-react, vendor-supabase, vendor-charts, vendor-utils)
## Routing Structure
- `/login` -- `src/pages/Login.tsx`
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
- Each hook maintains its own `error: string | null` state
- Supabase query errors are caught, message extracted, and set to error state
- Stale request protection: hooks use `abortRef` counter to ignore outdated responses (see `src/hooks/useLeads.ts`)
- Webhook failures are logged but do not block the main operation (fire-and-forget pattern in `src/hooks/useEnvioMassa.ts`)
- Timeout protection: `fetchWithTimeout` in `src/config/webhooks.ts` wraps fetch with 30s AbortController timeout
- Dashboard uses `Promise.allSettled` to handle partial failures gracefully (see `src/hooks/useDashboard.ts`)
- Retry utility available at `src/utils/retry.ts` (exponential backoff, max 2 retries)
## Cross-Cutting Concerns
<!-- GSD:architecture-end -->

<!-- GSD:workflow-start source:GSD defaults -->
## GSD Workflow Enforcement

Before using Edit, Write, or other file-changing tools, start work through a GSD command so planning artifacts and execution context stay in sync.

Use these entry points:
- `/gsd:quick` for small fixes, doc updates, and ad-hoc tasks
- `/gsd:debug` for investigation and bug fixing
- `/gsd:execute-phase` for planned phase work

Do not make direct repo edits outside a GSD workflow unless the user explicitly asks to bypass it.
<!-- GSD:workflow-end -->



<!-- GSD:profile-start -->
## Developer Profile

> Profile not yet configured. Run `/gsd:profile-user` to generate your developer profile.
> This section is managed by `generate-claude-profile` -- do not edit manually.
<!-- GSD:profile-end -->
