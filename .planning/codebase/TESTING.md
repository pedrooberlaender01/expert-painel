# Testing Patterns

**Analysis Date:** 2026-03-27

## Test Framework

**Runner:**
- None configured. No test runner (Jest, Vitest, etc.) is installed or configured.

**Assertion Library:**
- None installed.

**Run Commands:**
- No `test` script in `package.json`. Available scripts are: `dev`, `build`, `lint`, `preview`, `build:ghpages`, `lint:dualite`, `tsc:dualite`.

## Test File Organization

**Location:**
- No test files exist in the `src/` directory.
- The only test-related directory is `testsprite_tests/` at root (untracked, appears to be an external/generated artifact, not project tests).

**Naming:**
- No convention established (no test files to infer from).

## Test Coverage Status

**Coverage:** 0% -- No tests exist anywhere in the project source code.

**No coverage tooling configured.**

## Types of Tests Present

**Unit Tests:** None
**Integration Tests:** None
**E2E Tests:** None
**Component Tests:** None

## Testing Gaps

**Everything is untested.** The following areas carry the highest risk without tests:

### Critical - Business Logic in Hooks

**Data fetching hooks (all untested):**
- `src/hooks/useLeads.ts` - Lead listing with filters, pagination, realtime subscriptions
- `src/hooks/useDashboard.ts` - Dashboard metrics aggregation, date math, `Promise.allSettled` error handling
- `src/hooks/useEnvioMassa.ts` - Mass message sending flow with webhook calls, polling, Supabase inserts
- `src/hooks/useAgendamentos.ts` - Scheduling logic (522 lines, largest hook)
- `src/hooks/useWhatsappRotacao.ts` - WhatsApp number rotation logic (409 lines)
- `src/hooks/useModeracao.ts` - Group moderation logic (332 lines)
- `src/hooks/useGerarCopy.ts` - AI copy generation

**Auth store:**
- `src/stores/authStore.ts` - Login flow, brute-force lockout timing, session expiration, localStorage persistence

### High Priority - Utility Functions

These are pure functions, easiest to test first:
- `src/utils/formatters.ts` - Phone formatting, date formatting, status label mapping, relative time
- `src/utils/cn.ts` - Class name merging (trivial but good for validation)
- `src/utils/retry.ts` - Exponential backoff retry logic
- `src/config/webhooks.ts` - `fetchWithTimeout` function with AbortController

### Medium Priority - Date/Time Logic

Multiple files contain hand-rolled date manipulation that is error-prone:
- `src/hooks/useDashboard.ts` lines 70-86: `formatLocalDate`, `parseTimestamp`, `localStartOfDayUTC`, `localEndOfDayUTC`
- `src/pages/Dashboard.tsx` line 48: `parseLocalDate` function to avoid UTC timezone shift
- `src/utils/formatters.ts`: `formatTempoNoGrupo` with manual time difference calculation

### Medium Priority - Components

Large page components with complex UI logic:
- `src/pages/Grupos.tsx` (3670 lines) - Extremely large, likely contains significant inline logic
- `src/pages/Torneios.tsx` (2157 lines) - Tournament management
- `src/pages/Conversas.tsx` (1103 lines) - Chat interface
- `src/pages/Leads.tsx` (1021 lines) - Lead table with filtering

### Low Priority - Simple Components

- `src/components/MetricCard.tsx` - Display only
- `src/components/PageHeader.tsx` - Display only
- `src/components/LeadBadge.tsx` - Display only
- `src/components/Toast.tsx` - Display only

## Recommended Test Setup

To add testing to this project, install Vitest (already uses Vite):

```bash
npm install -D vitest @testing-library/react @testing-library/jest-dom jsdom
```

**Suggested `vitest.config.ts`:**
```typescript
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: './src/test/setup.ts',
  },
});
```

**Suggested `package.json` script additions:**
```json
{
  "scripts": {
    "test": "vitest",
    "test:run": "vitest run",
    "test:coverage": "vitest run --coverage"
  }
}
```

**Suggested file organization:**
- Co-locate test files: `src/utils/formatters.test.ts` next to `src/utils/formatters.ts`
- Hook tests: `src/hooks/__tests__/useLeads.test.ts`
- Component tests: `src/components/__tests__/MetricCard.test.tsx`

## Where to Start Testing

**Phase 1 - Pure utility functions (highest ROI, zero mocking needed):**
1. `src/utils/formatters.ts` - All exported functions
2. `src/utils/retry.ts` - `withRetry` function
3. `src/config/webhooks.ts` - `fetchWithTimeout` function
4. Date helper functions extracted from `src/hooks/useDashboard.ts`

**Phase 2 - Store logic:**
5. `src/stores/authStore.ts` - Mock localStorage and Supabase, test login/lockout/session flows

**Phase 3 - Hook logic (requires Supabase mocking):**
6. `src/hooks/useLeads.ts` - Test filter application, pagination, stale response handling
7. `src/hooks/useDashboard.ts` - Test metrics derivation, error fallback logic

**Phase 4 - Component rendering:**
8. Key UI components with `@testing-library/react`

---

*Testing analysis: 2026-03-27*
