# Codebase Structure

**Analysis Date:** 2026-03-27

## Directory Layout

```
Dashboard - Leads/
├── src/                        # Application source code
│   ├── assets/                 # Static assets (SVG logos)
│   ├── backend/                # Supabase client re-export and env config
│   ├── components/             # Reusable UI components
│   │   ├── agendamentos/       # Scheduling feature components
│   │   ├── copy/               # AI copy generation components
│   │   ├── envios/             # Mass send feature components
│   │   ├── mensagens/          # Funnel message components
│   │   └── numeros/            # WhatsApp number management components
│   ├── config/                 # External service configuration (webhooks)
│   ├── context/                # React Context (empty -- not used)
│   ├── data/                   # Mock/static data
│   ├── hooks/                  # Custom React hooks (data fetching layer)
│   ├── lib/                    # Library singletons (Supabase client)
│   ├── pages/                  # Route-level page components
│   ├── stores/                 # Zustand stores (auth only)
│   ├── types/                  # TypeScript type definitions
│   └── utils/                  # Pure utility functions
├── docs/                       # GitHub Pages deployment output (built assets)
├── github-pages/               # Alternative build output directory
├── gh-pages-package/           # GitHub Pages deployment helper
├── public/                     # Static public assets (favicon, etc.)
├── testsprite_tests/           # Test scaffold (not active test suite)
├── index.html                  # HTML entry point
├── vite.config.ts              # Vite config (primary)
├── vite.config.ghpages.ts      # Vite config (GitHub Pages build variant)
├── tailwind.config.js          # Tailwind CSS config with custom design tokens
├── tsconfig.json               # TypeScript config (root)
├── tsconfig.app.json           # TypeScript config (app)
├── tsconfig.node.json          # TypeScript config (node/build tools)
├── tsconfig.dualite.json       # TypeScript config (dualite tooling)
├── eslint.config.js            # ESLint config
├── eslint.dualite.config.js    # ESLint config (dualite variant)
├── postcss.config.js           # PostCSS config (Tailwind + Autoprefixer)
├── netlify.toml                # Netlify deployment config
└── package.json                # Dependencies and scripts
```

## Directory Purposes

**`src/pages/`:**
- Purpose: One component per route. Each page is a full-screen view.
- Contains: 19 `.tsx` files, one per route
- Key files:
  - `src/pages/Dashboard.tsx`: Main dashboard with metrics, charts, lead tables
  - `src/pages/Leads.tsx`: Lead listing with filters and pagination
  - `src/pages/Envios.tsx`: Mass send configuration page
  - `src/pages/Conversas.tsx`: WhatsApp conversation viewer
  - `src/pages/Torneios.tsx`: Tournament management
  - `src/pages/GerarCopy.tsx`: AI-powered copy generation
  - `src/pages/Agendamentos.tsx`: Scheduling new sends
  - `src/pages/Agendados.tsx`: Viewing scheduled sends
  - `src/pages/Login.tsx`: Authentication page

**`src/components/`:**
- Purpose: Reusable UI building blocks, shared across pages
- Contains: 6 shared components + 5 domain subdirectories
- Key shared files:
  - `src/components/Sidebar.tsx`: Main navigation sidebar (desktop + mobile)
  - `src/components/ProtectedRoute.tsx`: Auth guard wrapper
  - `src/components/MetricCard.tsx`: Dashboard KPI card
  - `src/components/PageHeader.tsx`: Standard page header
  - `src/components/LeadBadge.tsx`: Lead status badge
  - `src/components/Toast.tsx`: Toast notification component

**`src/components/envios/`:**
- Purpose: Components specific to the mass messaging (envios) feature
- Contains: 15 components (EnviosNav, MensagemEditor, TemplateSelector, FiltroStatus, FiltroPeriodo, DelaySlider, LeadPreviewList, ProgressoEnvioModal, SalvarTemplateModal, etc.)

**`src/components/agendamentos/`:**
- Purpose: Components for scheduling sends
- Contains: 9 components (AgendamentoCard, AgendamentoDatePicker, CanalSelector, GrupoSelector, MensagemBiblioteca, NovaMensagemModal, AudioPlayer, etc.)

**`src/components/copy/`:**
- Purpose: Components for the AI copy generation feature
- Contains: 10 components (TipoCopySelector, TamanhoSelector, TagInput, CopyResultCard, ExpertPerfilSidebar, BaseConhecimento, QualidadeStars, etc.)

**`src/components/mensagens/`:**
- Purpose: Components for funnel message management
- Contains: 4 components (MensagemCard, FollowupCard, GatilhoCard, MensagensAbertura)

**`src/components/numeros/`:**
- Purpose: Components for WhatsApp number/instance management
- Contains: 8 components (InstanciaCard, NumeroCard, NumeroFormModal, NovaInstanciaModal, MensagemAberturaCard, etc.)

**`src/hooks/`:**
- Purpose: All data fetching, Supabase queries, realtime subscriptions, and domain logic
- Contains: 16 custom hooks
- Key files:
  - `src/hooks/useDashboard.ts`: Dashboard metrics + chart data + realtime
  - `src/hooks/useLeads.ts`: Lead listing with filters, pagination, realtime
  - `src/hooks/useEnvioMassa.ts`: Mass send orchestration (Supabase + N8N webhook + polling)
  - `src/hooks/useFunil.ts`: Funnel status data
  - `src/hooks/useTemplates.ts`: Message template CRUD
  - `src/hooks/useHistoricoEnvios.ts`: Send history queries
  - `src/hooks/useMensagensFunil.ts`: Funnel message configuration
  - `src/hooks/useWhatsappRotacao.ts`: WhatsApp number rotation management
  - `src/hooks/useAgendamentos.ts`: Scheduling logic
  - `src/hooks/useGerarCopy.ts`: AI copy generation via N8N webhook
  - `src/hooks/useModeracao.ts`: Group moderation
  - `src/hooks/useConfiguracoes.ts`: App settings CRUD
  - `src/hooks/useNotificacoes.ts`: Notification management
  - `src/hooks/useSupabase.ts`: Simple hook returning Supabase client
  - `src/hooks/useToast.ts`: Toast notification state management
  - `src/hooks/useVisibilityRefresh.ts`: Tab visibility + network reconnect refresh

**`src/stores/`:**
- Purpose: Global state management (Zustand)
- Contains: Single store
- Key files: `src/stores/authStore.ts` (user session, login/logout, brute-force protection)

**`src/types/`:**
- Purpose: TypeScript type definitions
- Contains: 3 files
- Key files:
  - `src/types/database.ts`: Full Supabase Database type (all tables: leads, notificacoes, templates_mensagem, envios_massa, envios_massa_leads, dashboard_users, metricas_diarias, configuracoes, membros_grupo, mensagens_funil_v2, whatsapp_rotacao, whatsapp_rotacao_mensagens; views; functions)
  - `src/types/index.ts`: Simpler domain types (Lead, Notificacao, MetricaDiaria, User, StatusLead)
  - `src/types/envios.ts`: Envio-specific types (Template, HistoricoEnvio, EnvioConfig, EnvioProgresso, EnvioLog)

**`src/utils/`:**
- Purpose: Pure utility functions with no side effects
- Contains: 3 files
- Key files:
  - `src/utils/cn.ts`: Tailwind class merging (`clsx` + `twMerge`)
  - `src/utils/formatters.ts`: Date, phone, status label, and color formatting functions
  - `src/utils/retry.ts`: Async retry with exponential backoff

**`src/config/`:**
- Purpose: External service configuration
- Contains: 1 file
- Key files: `src/config/webhooks.ts` (all N8N webhook URLs, UAZAPI base URL, fetchWithTimeout helper)

**`src/lib/`:**
- Purpose: Third-party client singletons
- Contains: 1 file
- Key files: `src/lib/supabase.ts` (Supabase client creation with env vars)

**`src/backend/`:**
- Purpose: Backend client re-exports and environment helpers
- Contains: 2 files
- Key files:
  - `src/backend/client.ts`: Re-exports supabase from `src/lib/supabase.ts`
  - `src/backend/env.ts`: Typed access to Vite env vars

**`src/data/`:**
- Purpose: Mock/static data for development and fallbacks
- Contains: `mockData.ts`, `mockHistoricoEnvios.ts`, `mockTemplates.ts`

**`src/context/`:**
- Purpose: Reserved for React Context (currently empty, not used)

**`src/assets/`:**
- Purpose: Static assets imported by components
- Contains: `Assinatura-A.svg` (logo)

## Key File Locations

**Entry Points:**
- `index.html`: HTML shell, loads fonts, sets CSP headers, mounts `src/main.tsx`
- `src/main.tsx`: React DOM render entry
- `src/App.tsx`: Router definition, ProtectedLayout shell, route mapping

**Configuration:**
- `vite.config.ts`: Primary build config (chunk splitting, esbuild drops)
- `vite.config.ghpages.ts`: GitHub Pages build variant
- `tailwind.config.js`: Custom design system tokens (surface, accent, txt, glass colors; Inter/Outfit/JetBrains Mono fonts; custom animations)
- `tsconfig.json` / `tsconfig.app.json`: TypeScript configuration
- `eslint.config.js`: Linting rules
- `postcss.config.js`: PostCSS pipeline

**Core Logic:**
- `src/stores/authStore.ts`: Authentication state machine
- `src/config/webhooks.ts`: All external service endpoints
- `src/types/database.ts`: Complete Supabase schema types
- `src/lib/supabase.ts`: Supabase client singleton

## Naming Conventions

**Files:**
- Pages: PascalCase `.tsx` (e.g., `Dashboard.tsx`, `CentralWhatsapp.tsx`, `SimuladorEnvios.tsx`)
- Shared components: PascalCase `.tsx` (e.g., `MetricCard.tsx`, `PageHeader.tsx`)
- Domain components: PascalCase `.tsx` in subdirectory (e.g., `envios/EnviosNav.tsx`, `copy/TipoCopySelector.tsx`)
- Hooks: camelCase with `use` prefix `.ts` (e.g., `useDashboard.ts`, `useEnvioMassa.ts`)
- Types: camelCase `.ts` (e.g., `database.ts`, `envios.ts`)
- Utils: camelCase `.ts` (e.g., `formatters.ts`, `retry.ts`)
- Stores: camelCase with domain name `.ts` (e.g., `authStore.ts`)

**Directories:**
- Feature component directories: lowercase (e.g., `envios/`, `mensagens/`, `agendamentos/`, `copy/`, `numeros/`)
- Infrastructure directories: lowercase (e.g., `hooks/`, `stores/`, `types/`, `utils/`, `config/`, `lib/`)

## Where to Add New Code

**New Page/Route:**
1. Create page component: `src/pages/NomePagina.tsx` (PascalCase)
2. Create data hook: `src/hooks/useNomePagina.ts`
3. Add route in `src/App.tsx` inside the ProtectedRoute block
4. Add nav item in `src/components/Sidebar.tsx` navItems array
5. Add any Supabase row types to `src/types/database.ts`

**New Feature within Existing Page:**
1. Create sub-components: `src/components/{feature}/ComponentName.tsx`
2. Create or extend hook: `src/hooks/use{Feature}.ts`
3. Add types: `src/types/{feature}.ts` or extend `src/types/database.ts`

**New Shared Component:**
- Place in `src/components/ComponentName.tsx`
- Use named export (not default)

**New Domain Component Group:**
- Create directory: `src/components/{domain}/`
- Place related components inside with PascalCase names

**New Hook:**
- Place in `src/hooks/use{Name}.ts`
- Follow pattern: useState for data/loading/error, useEffect for initial load, Supabase Realtime subscription, useVisibilityRefresh

**New Utility Function:**
- Add to existing file in `src/utils/` if related, or create new `src/utils/{name}.ts`

**New Supabase Table Types:**
- Add Row/Insert/Update interfaces to `src/types/database.ts`
- Add table entry to the `Database` type's `Tables` object

**New Webhook Endpoint:**
- Add to `WEBHOOKS` object in `src/config/webhooks.ts`

## Special Directories

**`docs/`:**
- Purpose: GitHub Pages deployment build output
- Generated: Yes (by `npm run build`)
- Committed: Yes (for GitHub Pages serving)

**`github-pages/`:**
- Purpose: Alternative build output directory (configured in `vite.config.ts` as `outDir`)
- Generated: Yes
- Committed: Yes

**`gh-pages-package/`:**
- Purpose: GitHub Pages deployment helper scripts
- Generated: No
- Committed: Yes

**`testsprite_tests/`:**
- Purpose: Test scaffolding (appears unused -- contains only tmp/prd_files)
- Generated: No
- Committed: Unclear -- not an active test suite

**`node_modules/`:**
- Purpose: npm dependencies
- Generated: Yes
- Committed: No

---

*Structure analysis: 2026-03-27*
