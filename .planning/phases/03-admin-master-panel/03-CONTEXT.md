# Phase 3: Admin Master Panel - Context

**Gathered:** 2026-03-27
**Status:** Ready for planning

<domain>
## Phase Boundary

Full admin master panel at /admin with its own sidebar. Agency admin can manage experts (CRUD + credentials), configure plans, view consolidated metrics, impersonate experts, assign instances, and configure voice_id. Covers ADMN-01 through ADMN-11 and PLAN-01/02/03/08.

</domain>

<decisions>
## Implementation Decisions

### Admin Layout
- **D-01:** /admin has its OWN sidebar, separate from the expert sidebar. Same dark glassmorphism aesthetic (#0a0a0a, #1a1a1a, #232328) but different navigation items.
- **D-02:** Admin sidebar navigation: Experts, Planos, Dashboard Global (3 items). No "Configurações" section for now.
- **D-03:** /admin route already protected with requiredRole="admin" from Phase 2.

### Expert CRUD
- **D-04:** Expert create/edit uses a DEDICATED PAGE (/admin/experts/new and /admin/experts/:id/edit), not modal/drawer.
- **D-05:** Color picker: curated palette (8-12 colors) + custom hex input field. User picks from palette or types hex.
- **D-06:** Logo upload via Supabase Storage. Upload to bucket, save public URL to experts.logo_url.
- **D-07:** Credentials (email + password) are created IN THE SAME FORM as the expert. On save, creates expert record AND admin_users login entry.
- **D-08:** Expert list is a table with columns: name, plano, status (ativo/suspenso), leads count, instances count, actions (edit, impersonate, suspend).

### Dashboard Global
- **D-09:** Metrics cards at top: Total de Leads (all experts), Envios do Mês, Experts Ativos/Total, Instâncias Conectadas.
- **D-10:** Breakdown by expert as a SORTABLE TABLE: expert name | leads | envios | instâncias | plano | status. Orderable by any column.
- **D-11:** All metrics fetched via service_role RPCs (admin bypasses RLS per Phase 2 D-03).

### Impersonation
- **D-12:** "Ver como expert" button in the expert list table. Loads the expert's panel (normal dashboard) with their data and colors.
- **D-13:** FIXED BANNER AT TOP when impersonating: colored bar with "Você está vendo como [Expert Name] — Sair". Always visible, cannot be dismissed.
- **D-14:** "Sair" in the banner returns admin to /admin. Impersonation state stored in authStore (impersonatedExpertId).
- **D-15:** During impersonation, admin sees the expert's panel exactly as the expert would (same data, same colors, same layout). All queries use the impersonated expert's expert_id.

### Plan Management
- **D-16:** Plan list page with editable table: name, max_leads, max_instancias, max_envios_mes, features_permitidas, ativo.
- **D-17:** Editing is inline in the table or via modal — Claude's discretion on best UX.
- **D-18:** Three default plans (Basico, Pro, Enterprise) already seeded from Phase 1. Admin can edit values and add new plans.

### Instance & Voice Assignment
- **D-19:** In the expert edit page, admin can see assigned instances and assign/remove UAZAPI instances.
- **D-20:** voice_id is a text input field in the expert edit page (manual entry for now). Voice cloning self-service is Phase v2.

### Claude's Discretion
- Admin sidebar component structure (reuse pattern from expert sidebar or new component)
- Table component implementation (reuse existing patterns or new DataTable)
- Form validation UX patterns
- Loading/error states for admin pages
- Exact metric aggregation SQL queries

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Auth (from Phase 2)
- `src/stores/authStore.ts` — Auth store with isAdmin(), role, expert profile. Add impersonation state here.
- `src/components/ProtectedRoute.tsx` — Route protection with requiredRole prop
- `src/App.tsx` — Router with /admin route

### UI Patterns
- `src/components/Sidebar.tsx` — Expert sidebar (reference for admin sidebar aesthetic)
- `src/components/MetricCard.tsx` — Reusable metric card component
- `src/components/PageHeader.tsx` — Page header component
- `src/pages/Dashboard.tsx` — Expert dashboard (reference for admin dashboard layout)
- `src/pages/Leads.tsx` — Table/list page pattern (reference for expert list)

### Database
- `src/types/database.ts` — ExpertRow, PlanoRow, AdminUserRow types
- `src/types/index.ts` — User, ExpertProfile interfaces

### Codebase Maps
- `.planning/codebase/CONVENTIONS.md` — Code style, component patterns
- `.planning/codebase/STRUCTURE.md` — Directory layout

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `MetricCard.tsx` — Metric display card, reuse for admin dashboard metrics
- `PageHeader.tsx` — Page header with title/subtitle, reuse for admin pages
- `Sidebar.tsx` — Expert sidebar, reference for building AdminSidebar with same aesthetic
- `LeadBadge.tsx` — Status badge, reuse pattern for expert status badges
- Tailwind classes throughout — #0a0a0a, #1a1a1a, glassmorphism patterns

### Established Patterns
- Zustand for global state (authStore) — add impersonation state here
- Supabase RPC calls for data fetching
- React Router HashRouter with nested routes
- Toast notifications for feedback

### Integration Points
- `App.tsx` — Add nested admin routes (/admin/experts, /admin/planos, /admin/dashboard)
- `authStore.ts` — Add impersonatedExpertId, startImpersonation(), stopImpersonation()
- Supabase Storage — New bucket for expert logos
- Admin RPCs — New Supabase functions using service_role for cross-expert data

</code_context>

<specifics>
## Specific Ideas

- Admin sidebar should show "Admin Master" or agency name at the top (not expert name)
- Expert list table should show a colored dot with the expert's cor_primaria next to their name
- Impersonation banner should use the expert's cor_primaria as background color for visual feedback
- Dashboard metrics should update in real-time or on page load (no manual refresh needed)
- Expert form should preview the color palette selection in real-time (small colored circle)

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 03-admin-master-panel*
*Context gathered: 2026-03-27*
