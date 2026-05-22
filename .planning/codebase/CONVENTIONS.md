# Coding Conventions

**Analysis Date:** 2026-03-27

## Naming Patterns

**Files:**
- Pages: PascalCase matching the route concept, e.g. `src/pages/Dashboard.tsx`, `src/pages/CentralWhatsapp.tsx`, `src/pages/GerarCopy.tsx`
- Components: PascalCase, e.g. `src/components/MetricCard.tsx`, `src/components/PageHeader.tsx`
- Components in feature subdirectories: `src/components/envios/TemplateCard.tsx`, `src/components/agendamentos/AgendamentoCard.tsx`
- Hooks: camelCase prefixed with `use`, e.g. `src/hooks/useLeads.ts`, `src/hooks/useDashboard.ts`
- Stores: camelCase suffixed with `Store`, e.g. `src/stores/authStore.ts`
- Types: camelCase for the file, e.g. `src/types/database.ts`, `src/types/envios.ts`, `src/types/index.ts`
- Utilities: camelCase, e.g. `src/utils/formatters.ts`, `src/utils/cn.ts`, `src/utils/retry.ts`
- Config: camelCase, e.g. `src/config/webhooks.ts`

**Functions:**
- Use camelCase for all functions: `fetchLeads`, `iniciarEnvio`, `formatTelefone`, `getStatusLabel`
- Helper/private functions: camelCase, e.g. `formatLocalDate`, `parseTimestamp`, `getDelayMs`
- Exported hook functions: `useLeads`, `useDashboard`, `useToast`
- Portuguese naming is prevalent throughout business logic: `cancelar`, `resetar`, `deriveMetricas`

**Variables:**
- camelCase for local variables: `loadingLeads`, `envioId`, `pollingRef`
- UPPER_SNAKE_CASE for module-level constants: `AUTO_REFRESH_MS`, `AUTH_KEY`, `SESSION_DURATION_MS`, `WEBHOOK_URL`
- Database field names use snake_case (matching Supabase schema): `data_primeiro_contato`, `status_envio`

**Types/Interfaces:**
- PascalCase for types and interfaces: `LeadRow`, `DashboardMetricas`, `EnvioProgresso`
- Suffix `Row` for database row types: `LeadRow`, `NotificacaoRow`, `EnvioMassaRow`
- Suffix `Insert` / `Update` for mutation types: `LeadInsert`, `LeadUpdate`
- Suffix `Props` for component props: `MetricCardProps`, `PageHeaderProps`, `SidebarProps`
- Suffix `Return` for hook return types: `UseLeadsReturn`, `UseDashboardReturn`
- Suffix `Params` for hook parameter types: `UseLeadsParams`, `FetchLeadsParams`
- Use `type` keyword for union types and simple aliases, `interface` for object shapes

## Code Style

**Formatting:**
- No Prettier configured (no `.prettierrc` file)
- 2-space indentation (inferred from all source files)
- Single quotes for strings in TypeScript/JSX
- Semicolons used consistently
- Trailing commas in function parameters and object literals

**Linting:**
- ESLint 9 with flat config at `eslint.config.js`
- TypeScript ESLint recommended rules enabled
- `@typescript-eslint/no-explicit-any` is **disabled** (`"off"`) -- `any` is used freely in catch blocks and data transformations
- `no-empty` is **disabled**
- React Hooks plugin enabled
- Run via: `npm run lint`

**TypeScript Configuration:**
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

**Order (observed pattern):**
1. React imports: `import React, { useState, useEffect } from 'react'`
2. Third-party libraries: `react-router-dom`, `lucide-react`, `date-fns`, `recharts`
3. Local components: `'../components/PageHeader'`
4. Local hooks: `'../hooks/useDashboard'`
5. Local stores: `'../stores/authStore'`
6. Local utils/config: `'../utils/formatters'`, `'../config/webhooks'`
7. Local types: `'../types/database'` (often with `type` import keyword)

**Path Aliases:**
- No path aliases configured. All imports use relative paths (`../`, `./`)

**Type imports:**
- Use `import type { X }` for type-only imports (observed in hooks and pages):
  ```typescript
  import type { LeadRow } from '../types/database';
  import type { StatusLead as StatusLeadUI } from '../types';
  ```

## Component Patterns

**Functional components only.** No class components anywhere in the codebase.

**Export styles (mixed):**
- Named exports for most components: `export const MetricCard: React.FC<Props> = ...`
- Named exports with `function` for some: `export function ProtectedRoute({ children }: ...)`
- Default exports for some pages: `export default App`, `export default Conversas`, `export default GerarCopy`
- **Recommendation:** Use named exports for components. Default exports appear only on `App.tsx` and a few pages that were added later.

**Component typing:**
- `React.FC<Props>` pattern for most components: `export const Sidebar: React.FC<SidebarProps> = ...`
- Some components use inline destructured props without `React.FC`
- Props interfaces defined directly above the component in the same file

**Inline sub-components:**
- Small helper components (e.g. `Sparkline` in `src/components/MetricCard.tsx`, `DayPicker` in `src/pages/Dashboard.tsx`) are defined in the same file
- Larger feature components get their own file in a feature subdirectory

**Hooks usage pattern:**
- `useState` for all local UI state
- `useCallback` wrapping all async data-fetching functions
- `useEffect` for side effects (data loading, realtime subscriptions, cleanup)
- `useRef` for abort controllers, polling intervals, DOM refs
- Custom hooks return objects (not arrays): `{ leads, total, loading, error, refetch }`

## State Management

**Zustand** (single store):
- Only one store: `src/stores/authStore.ts` using `create<AuthState>()`
- Auth state managed via Zustand with localStorage persistence (manual, not middleware)
- Access pattern: `useAuthStore()` hook in components, `useAuthStore.getState()` outside React

**Local state (useState):**
- All page-level and component-level state uses `useState`
- No global state management beyond auth -- data fetching is per-page via custom hooks

**Data fetching pattern:**
- Custom hooks per data domain: `useLeads`, `useDashboard`, `useEnvioMassa`, etc.
- Each hook manages its own `loading`, `error`, `data` state
- Supabase client called directly inside hooks (no abstraction layer)
- Realtime subscriptions set up inside hooks via `supabase.channel()`
- Auto-refresh via `setInterval` in some hooks (e.g., `useDashboard` at 30s)
- Visibility-based refresh via `useVisibilityRefresh` hook
- Race condition protection via `useRef` abort counters (see `src/hooks/useLeads.ts` line 42)

## Error Handling

**Patterns:**
- try/catch in all async operations inside hooks
- Errors stored in state: `setError(err.message || 'Fallback message')`
- `console.error()` for logging (no external error tracking)
- Catch blocks typed as `catch (err: any)` in most places (ESLint `no-explicit-any` is off)
- Some newer code uses `catch (err: unknown)` with type narrowing (see `src/stores/authStore.ts` line 73)
- Non-critical errors (e.g., webhook failures) are caught and logged but do not block the main flow
- `Promise.allSettled` used for parallel fetches where partial failure is acceptable (see `src/hooks/useDashboard.ts`)

**Recommendation for new code:**
- Use `catch (err: unknown)` and narrow with `err instanceof Error`
- Always provide a fallback error message in Portuguese
- Use `Promise.allSettled` when multiple independent fetches can partially fail

## Logging

**Framework:** `console.error` / `console.log` only

**Patterns:**
- `console.error('Descriptive message in Portuguese:', err)` in catch blocks
- Production build strips all console statements via `esbuild.drop: ['console', 'debugger']` in `vite.config.ts`
- No structured logging or external logging service

## CSS / Styling Approach

**Primary: Tailwind CSS 3.x** with extensive custom theme in `tailwind.config.js`

**Design system:**
- Dark theme only (no light mode)
- Custom color tokens: `surface-*`, `accent-*`, `teal-*`, `txt-*`, `glass-*`
- Custom font families: `font-display` (Inter/Outfit), `font-mono` (JetBrains Mono)
- Custom animations: `fade-in`, `slide-up`, `slide-in-right`, `glow-pulse`, `shimmer`, `breathe`, `float`

**Glass morphism system (defined in `src/index.css`):**
- `.glass-card` - primary card style with backdrop blur
- `.card-glass` - alias of glass-card
- `.card-dark` - legacy alias mapped to same glass style
- `.card-dark-elevated` - elevated variant with stronger shadow
- `.inner-item` - for nested list items
- `.sidebar-glass` - sidebar-specific glass variant

**Inline styles:**
- Heavily used for dynamic colors, rgba values, and hover states
- Pattern: `style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.04)' }}`
- onMouseEnter/onMouseLeave handlers for hover effects (see `src/components/PageHeader.tsx`)

**Utility function:**
- `cn()` from `src/utils/cn.ts` combines `clsx` + `tailwind-merge` for conditional class merging
- Use `cn()` for all conditional Tailwind classes

**Responsive design:**
- Mobile-first with `md:` breakpoint for desktop
- Mobile sidebar uses overlay pattern with portal-like approach
- Responsive padding: `p-3 sm:p-4 md:p-6 lg:p-8`

## Comments

**When to Comment:**
- Section separators using line comments: `// --- Types ---`, `// --- Fetch helpers ---`, `// --- Hook ---`
- Decorative headers: `// ─── Period Selector Types ───`
- Inline explanations for non-obvious logic in Portuguese or English
- JSDoc-style comments on utility functions (see `src/hooks/useVisibilityRefresh.ts`, `src/utils/retry.ts`)

**JSDoc/TSDoc:**
- Used sparingly, only on shared utility functions
- Not used on components or hooks

## Module Design

**Exports:**
- One primary export per file (component, hook, or store)
- Helper types co-exported from hook files when tightly coupled
- Re-exports used in `src/backend/client.ts` (re-exports `supabase` from `../lib/supabase`)

**Barrel Files:**
- `src/types/index.ts` acts as a barrel for shared domain types
- No other barrel files -- all imports are direct file paths

---

*Convention analysis: 2026-03-27*
