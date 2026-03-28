---
phase: 03-admin-master-panel
verified: 2026-03-27T00:00:00Z
status: gaps_found
score: 10/13 must-haves verified
re_verification: false
gaps:
  - truth: "Admin dashboard shows 4 metric cards: Total Leads, Envios do Mes, Experts Ativos, Instancias Conectadas"
    status: failed
    reason: "admin_dashboard_metrics RPC is not deployed to Supabase. Schema cache reports 'Could not find the function public.admin_dashboard_metrics without parameters'. Migration file exists at supabase/migrations/20260328_03_03_admin_dashboard_planos_rpcs.sql but was not applied."
    artifacts:
      - path: "src/hooks/useAdminDashboard.ts"
        issue: "Hook is correct and calls admin_dashboard_metrics, but the RPC does not exist in the database. The page will show an error state on load."
      - path: "src/pages/admin/AdminDashboard.tsx"
        issue: "Page renders correctly but depends on a non-existent RPC — users see error state."
    missing:
      - "Apply migration supabase/migrations/20260328_03_03_admin_dashboard_planos_rpcs.sql to Supabase (run via MCP execute_sql or Supabase dashboard)"

  - truth: "Admin can see Planos page with editable table of all plans"
    status: failed
    reason: "admin_list_planos RPC is not deployed to Supabase. Schema cache reports 'Could not find the function public.admin_list_planos without parameters'. Same migration file as above was not applied."
    artifacts:
      - path: "src/hooks/useAdminPlanos.ts"
        issue: "Hook calls admin_list_planos but RPC does not exist — planos page will show error state."
      - path: "src/pages/admin/AdminPlanos.tsx"
        issue: "Page renders correctly but depends on non-existent RPCs (list, update, create)."
    missing:
      - "Apply migration supabase/migrations/20260328_03_03_admin_dashboard_planos_rpcs.sql to Supabase"

  - truth: "Admin can edit plan limits inline and save changes"
    status: failed
    reason: "admin_update_plano and admin_create_plano RPCs are also missing from database (same unapplied migration). Save operations will fail silently with 'Could not find function' errors."
    artifacts:
      - path: "src/hooks/useAdminPlanos.ts"
        issue: "updatePlano and createPlano methods call non-existent RPCs."
    missing:
      - "Apply migration supabase/migrations/20260328_03_03_admin_dashboard_planos_rpcs.sql to Supabase"

human_verification:
  - test: "Impersonation banner renders with expert color"
    expected: "After clicking 'Ver como expert' on any expert in AdminExperts, /dashboard loads with a fixed colored banner at top showing the expert's cor_primaria color. Clicking 'Sair' returns to /admin/experts and removes the banner."
    why_human: "Session-only state change and visual color rendering cannot be verified programmatically."
  - test: "Logo upload to expert-logos bucket"
    expected: "In AdminExpertForm, dragging or clicking to upload an image successfully uploads it. The bucket list returns empty from anon key — need to verify bucket exists with correct public policies using service_role key or Supabase dashboard."
    why_human: "Bucket listing via anon key returned empty array (possibly RLS-restricted to service_role). Cannot confirm bucket existence + policy programmatically with anon key alone."
  - test: "admin_create_expert fails on live data due to gen_salt"
    expected: "Test creating a new expert via the form. The RPC exists but currently errors with 'function gen_salt(unknown) does not exist' — this means the pgcrypto extension is not enabled. Verify if pgcrypto is enabled in Supabase project or if the existing admin_login RPC uses a different hashing approach."
    why_human: "pgcrypto extension availability requires Supabase dashboard check."
---

# Phase 3: Admin Master Panel — Verification Report

**Phase Goal:** Agency admin can create and manage experts, configure plans, view global metrics, and impersonate any expert for debugging
**Verified:** 2026-03-27
**Status:** GAPS FOUND
**Re-verification:** No — initial verification

---

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|---------|
| 1 | Admin user navigating to /admin sees AdminSidebar with Experts, Planos, Dashboard Global links | VERIFIED | AdminSidebar.tsx L17-21: navItems array has all 3 items; App.tsx L110-120: nested admin routes with AdminLayout |
| 2 | Non-admin user is redirected away from /admin routes | VERIFIED | App.tsx L111: `<ProtectedRoute requiredRole="admin">` wraps AdminLayout |
| 3 | AdminLayout renders dark glassmorphism aesthetic matching expert sidebar | VERIFIED | AdminLayout.tsx L17: same gradient background; AdminSidebar.tsx L35: `sidebar-glass` class; blue accent `rgba(59,130,246,0.15)` |
| 4 | authStore exposes impersonation state (impersonatedExpertId, startImpersonation, stopImpersonation) | VERIFIED | authStore.ts L11-21: all 4 items declared; L132-140: all 3 implemented; L140: getActiveExpertId |
| 5 | ImpersonationBanner renders fixed top bar with expert name and Sair button | VERIFIED | ImpersonationBanner.tsx L19: `fixed top-0`; L20: uses `impersonatedExpert.cor_primaria`; L24: renders `expert.nome`; L26-34: Sair button calls stopImpersonation |
| 6 | Admin sees table of all experts with name, plan, status, leads, instances, actions | VERIFIED | AdminExperts.tsx L118-226: full table with all 6 columns; data from admin_list_experts RPC (confirmed working: returns 1 expert) |
| 7 | Admin can create/edit expert with form including colors, logo, plan, credentials, voice | VERIFIED | AdminExpertForm.tsx: 7 sections present — basic data (L255-303), colors (L306-318), logo upload (L321-366), plan (L369-389), credentials (L391-423), instances (L425-453), voice (L455-469) |
| 8 | Admin can suspend/reactivate an expert from the list | VERIFIED | AdminExperts.tsx L17-21: handleToggle calls toggleExpert; L56-64: admin_toggle_expert RPC confirmed EXISTS in Supabase |
| 9 | Admin can impersonate an expert (Ver como expert) | VERIFIED | AdminExperts.tsx L23-50: handleImpersonate builds ExpertProfile and calls startImpersonation, navigates to /dashboard; ImpersonationBanner wired in AdminLayout.tsx L34 |
| 10 | Admin dashboard shows 4 metric cards and sortable expert breakdown table | FAILED | AdminDashboard.tsx is substantive (4 MetricCards L101-125, sortable table L127-216), but admin_dashboard_metrics RPC is MISSING from Supabase — page shows error state |
| 11 | Admin can see Planos page with editable table | FAILED | AdminPlanos.tsx is substantive with inline editing, but admin_list_planos RPC is MISSING from Supabase |
| 12 | Admin can edit plan limits and create new plans | FAILED | admin_update_plano and admin_create_plano are MISSING from Supabase |
| 13 | Three default plans exist with correct values (Basico 500/2/1000, Pro 2000/5/5000, Enterprise null/10/null) | VERIFIED | Direct query to planos table confirmed: Basico(500/2/1000), Pro(2000/5/5000), Enterprise(null/10/null) — values are correct |

**Score: 10/13 truths verified**

---

## Required Artifacts

| Artifact | Status | Details |
|----------|--------|---------|
| `src/components/admin/AdminSidebar.tsx` | VERIFIED | 99 lines, named export AdminSidebar, 3 nav items |
| `src/components/admin/AdminLayout.tsx` | VERIFIED | 51 lines, named export AdminLayout, wires AdminSidebar + ImpersonationBanner + Outlet |
| `src/components/admin/ImpersonationBanner.tsx` | VERIFIED | 37 lines, named export ImpersonationBanner, renders expert color + name + Sair |
| `src/stores/authStore.ts` | VERIFIED | 142 lines, impersonatedExpertId/impersonatedExpert/startImpersonation/stopImpersonation/getActiveExpertId all present |
| `src/types/admin.ts` | VERIFIED | 53 lines, exports AdminExpertListItem, ExpertFormData, AdminDashboardMetrics, ExpertBreakdownRow |
| `src/hooks/useAdminClient.ts` | VERIFIED | File exists and exports useAdminClient |
| `src/hooks/useAdminExperts.ts` | VERIFIED | 134 lines, full CRUD: admin_list_experts, admin_get_expert, admin_create_expert, admin_update_expert, admin_toggle_expert, uploadLogo |
| `src/hooks/useAdminDashboard.ts` | VERIFIED (code) / HOLLOW | 40 lines, calls admin_dashboard_metrics — but RPC missing in DB |
| `src/hooks/useAdminPlanos.ts` | VERIFIED (code) / HOLLOW | 66 lines, calls admin_list_planos — but RPC missing in DB |
| `src/pages/admin/AdminExperts.tsx` | VERIFIED | 232 lines, substantive table with impersonation, suspend/reactivate |
| `src/pages/admin/AdminExpertForm.tsx` | VERIFIED | 494 lines, 7 form sections, create/edit, logo upload |
| `src/pages/admin/AdminDashboard.tsx` | HOLLOW | 219 lines, substantive code, wired to hook — but RPC missing so page fails |
| `src/pages/admin/AdminPlanos.tsx` | HOLLOW | 383 lines, substantive inline editing — but RPCs missing so page fails |
| `src/App.tsx` | VERIFIED | All 5 admin routes wired: index(AdminDashboard), experts, experts/new, experts/:id/edit, planos |

---

## Key Link Verification

| From | To | Via | Status | Details |
|------|-----|-----|--------|---------|
| App.tsx | AdminLayout.tsx | Route element for /admin | WIRED | L24 import, L111 usage |
| AdminLayout.tsx | authStore.ts | impersonatedExpertId check | WIRED | L12: `const { impersonatedExpertId } = useAuthStore()` |
| AdminLayout.tsx | ImpersonationBanner.tsx | Conditional render | WIRED | L34: `{impersonatedExpertId && <ImpersonationBanner />}` |
| AdminExperts.tsx | useAdminExperts.ts | useAdminExperts hook | WIRED | L5 import, L12 usage |
| useAdminExperts.ts | supabase.rpc (admin_*) | 5 admin expert RPCs | WIRED (4/5) | admin_list_experts/get/toggle confirmed in DB; admin_create_expert EXISTS but has pgcrypto error |
| AdminExpertForm.tsx | supabase.storage (expert-logos) | uploadLogo | PARTIAL | Hook calls are correct; bucket existence unconfirmed via anon key |
| AdminDashboard.tsx | useAdminDashboard.ts | useAdminDashboard hook | WIRED | L5 import, L12 usage |
| useAdminDashboard.ts | supabase.rpc | admin_dashboard_metrics RPC | NOT WIRED | RPC code exists in migration file but is NOT deployed to Supabase |
| AdminPlanos.tsx | useAdminPlanos.ts | useAdminPlanos hook | WIRED | L4 import, L21 usage |
| useAdminPlanos.ts | supabase.rpc | admin_list_planos, admin_update_plano, admin_create_plano RPCs | NOT WIRED | RPCs not deployed to Supabase |

---

## Data-Flow Trace (Level 4)

| Artifact | Data Variable | Source | Produces Real Data | Status |
|----------|--------------|--------|-------------------|--------|
| AdminExperts.tsx | experts[] | admin_list_experts RPC | Yes — returns 1 expert confirmed | FLOWING |
| AdminDashboard.tsx | metrics, breakdown | admin_dashboard_metrics RPC | No — RPC missing | DISCONNECTED |
| AdminPlanos.tsx | planos[] | admin_list_planos RPC | No — RPC missing | DISCONNECTED |
| AdminExpertForm.tsx (edit) | form data | admin_get_expert RPC | EXISTS in DB (returns null for bad UUID, not "not found") | FLOWING |
| AdminExpertForm.tsx (create) | planos list | Direct supabase.from('planos') query | Yes — planos table accessible and returns 3 plans | FLOWING |

---

## Behavioral Spot-Checks

| Behavior | Command | Result | Status |
|----------|---------|--------|--------|
| admin_list_experts returns data | `supabase.rpc('admin_list_experts')` | count=1 (Allan's expert) | PASS |
| admin_dashboard_metrics available | `supabase.rpc('admin_dashboard_metrics')` | ERROR: function not found in schema cache | FAIL |
| admin_list_planos available | `supabase.rpc('admin_list_planos')` | ERROR: function not found in schema cache | FAIL |
| admin_update_plano available | `supabase.rpc('admin_update_plano', {...})` | MISSING | FAIL |
| admin_create_plano available | `supabase.rpc('admin_create_plano', {...})` | MISSING | FAIL |
| admin_toggle_expert available | `supabase.rpc('admin_toggle_expert', {...})` | EXISTS (returns success:true) | PASS |
| admin_create_expert available | `supabase.rpc('admin_create_expert', {...})` | EXISTS but errors: gen_salt missing (pgcrypto not enabled) | FAIL |
| admin_get_expert available | `supabase.rpc('admin_get_expert', {...})` | EXISTS (returns null for missing UUID) | PASS |
| Planos default values correct | direct `planos` table query | Basico(500/2/1000), Pro(2000/5/5000), Enterprise(null/10/null) | PASS |
| TypeScript compilation | `npx tsc --noEmit` | No output (clean) | PASS |

---

## Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|------------|-------------|--------|---------|
| ADMN-01 | 03-01-PLAN | /admin route protected, admin role only | SATISFIED | App.tsx L111: ProtectedRoute requiredRole="admin" |
| ADMN-02 | 03-02-PLAN | Admin can create new expert | PARTIAL | Form + RPC exist; admin_create_expert has pgcrypto dependency error |
| ADMN-03 | 03-02-PLAN | Admin can edit any expert's data | SATISFIED | AdminExpertForm.tsx edit mode; admin_update_expert confirmed via hook wiring |
| ADMN-04 | 03-02-PLAN | Admin can suspend/reactivate expert | SATISFIED | admin_toggle_expert confirmed working in DB |
| ADMN-05 | 03-02-PLAN | Admin can create user login for expert | PARTIAL | Included in admin_create_expert; but blocked by same pgcrypto issue |
| ADMN-06 | 03-03-PLAN | Global dashboard with consolidated metrics | BLOCKED | admin_dashboard_metrics RPC not deployed |
| ADMN-07 | 03-03-PLAN | Breakdown metrics per expert | BLOCKED | Same — part of admin_dashboard_metrics RPC |
| ADMN-08 | 03-03-PLAN | Admin can create/edit plans with limits | BLOCKED | admin_list_planos, admin_update_plano, admin_create_plano not deployed |
| ADMN-09 | 03-01-PLAN | Admin can impersonate any expert | SATISFIED | Full flow: AdminExperts -> getExpertDetail -> startImpersonation -> /dashboard; ImpersonationBanner wired |
| ADMN-10 | 03-02-PLAN | Admin can assign/remove UAZAPI instances | PARTIAL | Read-only display in AdminExpertForm; admin_assign_instance RPC described as "informational for MVP" in plan — no write operations implemented |
| ADMN-11 | 03-02-PLAN | Admin can configure voice_id per expert | SATISFIED | AdminExpertForm.tsx L456-469: voice_id text input; admin_update_expert includes p_voice_id |
| PLAN-01 | 03-03-PLAN | Basico plan: 500/2/1000/agendamento | SATISFIED | Confirmed in DB: max_leads=500, max_instancias=2, max_envios_mes=1000 |
| PLAN-02 | 03-03-PLAN | Pro plan: 2000/5/5000/agendamento+torneio+copy_ia | SATISFIED | Confirmed in DB: max_leads=2000, max_instancias=5, max_envios_mes=5000 |
| PLAN-03 | 03-03-PLAN | Enterprise: null/10/null/all features | SATISFIED | Confirmed in DB: max_leads=null, max_instancias=10, max_envios_mes=null |
| PLAN-08 | 03-03-PLAN | Plan values editable by admin | BLOCKED | AdminPlanos.tsx is substantive but RPCs not deployed |

---

## Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| src/pages/admin/AdminPlanos.tsx | 77, 89 | `console.error('Erro ao criar/atualizar plano:', res.error)` | Info | Silent error — user has no visible feedback on save failure other than the error not propagating to UI state |
| src/pages/admin/AdminExpertForm.tsx | 159-161 | Direct `supabase.from('planos')` in create mode | Info | Bypasses RLS — not a bug since planos is likely publicly readable, but inconsistent with admin RPC pattern established in plan |

No blockers from anti-pattern scan. The console.error patterns are warnings, not blockers. The direct Supabase query in AdminExpertForm for planos is a minor pattern inconsistency but not a functional issue.

---

## Human Verification Required

### 1. Impersonation Banner Visual Check

**Test:** Log in as admin, navigate to /admin/experts, click the Eye icon on any expert, verify /dashboard loads with a fixed colored banner at top showing "Voce esta vendo como [Expert Name]" in the expert's primary color. Click "Sair" and verify return to /admin/experts with banner gone.
**Expected:** Banner uses expert's cor_primaria as background color. Sair button stops impersonation.
**Why human:** Session-only state and visual color rendering cannot be programmatically verified.

### 2. expert-logos Storage Bucket

**Test:** Check Supabase dashboard under Storage — verify bucket named `expert-logos` exists with public read policy. Then test uploading a logo via AdminExpertForm — drag an image onto the logo zone and confirm the public URL renders as a preview.
**Expected:** Bucket exists, upload succeeds, thumbnail shows.
**Why human:** listBuckets via anon key returns empty array (may require service_role key or dashboard access to confirm). Functional upload test requires a running browser session.

### 3. admin_create_expert pgcrypto Dependency

**Test:** In Supabase dashboard, check if pgcrypto extension is enabled (Settings > Database > Extensions). If not enabled, enable it. Then test creating a new expert via /admin/experts/new — confirm the expert appears in the list with working login credentials.
**Expected:** Extension enabled; expert creation and credential assignment work atomically.
**Why human:** Extension status requires Supabase dashboard access. pgcrypto enablement is a one-time admin action.

---

## Gaps Summary

Three functional areas are blocked by a single root cause: **migration file `20260328_03_03_admin_dashboard_planos_rpcs.sql` was never applied to Supabase**.

This file contains 4 RPCs:
- `admin_dashboard_metrics` — powers AdminDashboard page (truths 10, ADMN-06, ADMN-07)
- `admin_list_planos` — powers AdminPlanos list view (truth 11, ADMN-08, PLAN-08)
- `admin_update_plano` — powers inline plan editing (truth 12, ADMN-08)
- `admin_create_plano` — powers new plan creation (truth 12, ADMN-08)

It also contains the default plan value UPDATEs — but those ran separately (planos table has correct values), suggesting the UPDATEs were run independently but the CREATE FUNCTION statements were not.

A secondary gap is that `admin_create_expert` exists in the DB but errors at runtime due to the `gen_salt` / `crypt` functions requiring the `pgcrypto` extension, which appears to be not enabled. This blocks ADMN-02 and ADMN-05 (expert creation with credentials).

The fix for all dashboard/planos gaps is a single SQL execution. The pgcrypto gap requires enabling the extension in Supabase settings.

All frontend code is complete, substantive, and correctly wired. The gaps are entirely database-side.

---

_Verified: 2026-03-27_
_Verifier: Claude (gsd-verifier)_
