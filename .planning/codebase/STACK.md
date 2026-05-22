# Technology Stack

**Analysis Date:** 2026-03-27

## Languages

**Primary:**
- TypeScript ^5.8.3 - All application source code (`src/**/*.ts`, `src/**/*.tsx`)
- TSX (React JSX) - UI components and pages

**Secondary:**
- JavaScript - Configuration files (`vite.config.ts`, `tailwind.config.js`, `postcss.config.js`, `eslint.config.js`)
- HTML - Entry point (`index.html`)
- CSS - Styles (`src/index.css`) with Tailwind directives

## Runtime

**Environment:**
- Browser (SPA) - No server-side runtime
- Node.js - Development tooling only (Vite dev server, ESLint, TypeScript compiler)

**Package Manager:**
- npm - `package-lock.json` present
- Lockfile: present

## Frameworks

**Core:**
- React ^19.1.0 - UI framework
- React DOM ^19.1.0 - DOM rendering
- React Router DOM ^7.13.0 - Client-side routing
- Zustand ^5.0.5 - State management (stores in `src/stores/`)

**Styling:**
- Tailwind CSS ^3.4.1 - Utility-first CSS framework
- PostCSS ^8.4.35 - CSS processing pipeline
- Autoprefixer ^10.4.21 - Vendor prefixing
- clsx ^2.1.1 - Conditional class name joining
- tailwind-merge ^3.4.0 - Tailwind class conflict resolution

**Build/Dev:**
- Vite ^6.3.5 - Build tool and dev server
- @vitejs/plugin-react ^4.5.0 - React Fast Refresh and JSX transform
- esbuild (via Vite) - Transpilation and minification

## Key Dependencies

**Critical:**
- `@supabase/supabase-js` ^2.97.0 - Database client and backend-as-a-service SDK. Used for all data operations (queries, RPCs, inserts, updates, deletes)
- `zustand` ^5.0.5 - Global state management. Auth store at `src/stores/authStore.ts`
- `react-router-dom` ^7.13.0 - All page routing and navigation
- `axios` ^1.9.0 - HTTP client for webhook calls (used alongside native `fetch`)

**UI/Charting:**
- `recharts` ^3.7.0 - Dashboard charts and data visualization
- `lucide-react` ^0.511.0 - Icon library (excluded from Vite optimizeDeps)

**Utilities:**
- `date-fns` ^4.1.0 - Date formatting and manipulation
- `clsx` ^2.1.1 + `tailwind-merge` ^3.4.0 - Class name utilities

## TypeScript Configuration

**Compiler Target:** ES2020
**Module System:** ESNext with bundler module resolution
**Strict Mode:** Enabled
**JSX:** react-jsx (automatic runtime)
**Key Strictness Settings:**
- `strict: true`
- `noUnusedLocals: true`
- `noUnusedParameters: true`
- `noFallthroughCasesInSwitch: true`

**Config Files:**
- `tsconfig.json` - Root config (references app + node configs)
- `tsconfig.app.json` - Application source config (includes `src/`)
- `tsconfig.node.json` - Node tooling config

## Linting

**ESLint** ^9.27.0 (flat config format):
- Config: `eslint.config.js`
- Plugins: `typescript-eslint` ^8.32.1, `eslint-plugin-react-hooks` ^5.2.0, `eslint-plugin-react-refresh` ^0.4.20, `eslint-plugin-import` ^2.32.0
- Key Rules:
  - `@typescript-eslint/no-explicit-any`: OFF (allows `any` usage)
  - `no-empty`: OFF
- Ignores: `github-pages/`, `dist/`, `node_modules/`

**No formatter tool detected** (no Prettier config found).

## Build Configuration

**Vite Config:** `vite.config.ts`
- Base path: `./` (relative)
- Output dir: `github-pages/`
- Sourcemaps: disabled in production
- Console/debugger statements: stripped via esbuild `drop`
- Manual chunks for code splitting:
  - `vendor-react`: react, react-dom, react-router-dom
  - `vendor-supabase`: @supabase/supabase-js
  - `vendor-charts`: recharts
  - `vendor-utils`: date-fns, clsx, tailwind-merge, axios

**GitHub Pages Build:**
- Separate config: `vite.config.ghpages.ts` (referenced in `build:ghpages` script)
- Output: `github-pages/` directory

## Scripts

```bash
npm run dev          # Vite dev server
npm run build        # Production build → github-pages/
npm run preview      # Preview production build
npm run lint         # ESLint check
npm run build:ghpages # GitHub Pages specific build
```

## Tailwind Theme

**Config:** `tailwind.config.js`
- Dark theme by default (surface colors start at `#0a0a0f`)
- Custom color tokens: `surface`, `accent`, `teal`, `txt`, `glass`
- Custom fonts: Inter, Outfit (display/body), JetBrains Mono (monospace)
- Custom animations: fade-in, slide-up, slide-in-right, glow-pulse, shimmer, breathe, float, border-flow
- Background patterns: noise, grid-pattern, mesh-gradient

## Platform Requirements

**Development:**
- Node.js (version not pinned - no `.nvmrc`)
- npm for package management

**Production:**
- Static file hosting (GitHub Pages)
- No server-side runtime required

---

*Stack analysis: 2026-03-27*
