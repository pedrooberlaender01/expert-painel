# Phase 4: White-Label & Plan Enforcement - Context

**Gathered:** 2026-03-28
**Status:** Ready for planning

<domain>
## Phase Boundary

Replace all hardcoded #10b981 (emerald) with CSS Variables driven by expert profile. Sidebar shows expert logo/name. Plan limits enforced (leads, instances, sends/month) with visual blocking. Features gated by plan with disabled sidebar items. "Helena" name change is n8n-only (Phase 5).

</domain>

<decisions>
## Implementation Decisions

### Color System Migration
- **D-01:** Use Tailwind CSS Variables plugin approach. Define `primary` color in tailwind.config as `var(--color-primary)`. This enables native Tailwind classes: `bg-primary`, `text-primary`, `border-primary`, etc.
- **D-02:** Replace ALL hardcoded #10b981, bg-emerald-500, text-emerald-*, border-emerald-* with the new `primary` color classes throughout the codebase.
- **D-03:** Define CSS Variables in :root: `--color-primary`, `--color-primary-hover` (cor_secundaria), `--color-primary-bg` (primary with low opacity for backgrounds).
- **D-04:** Apply colors in App.tsx via useEffect watching authStore user. When user/impersonatedExpert changes, set CSS variables on document.documentElement. This also handles impersonation (admin sees expert's colors).

### Sidebar Dynamic Content
- **D-05:** Sidebar shows expert logo from experts.logo_url. If no logo, show INITIALS in a circle with cor_primaria as background (e.g., "AC" for Allan Cabral).
- **D-06:** Sidebar shows experts.nome_plataforma instead of hardcoded "AUTOMAÇÕES".
- **D-07:** "Helena" name substitution is NOT in this phase — it only appears in n8n workflows/funil messages. Phase 5 (N8N) handles replacing "Helena" with expert's nome_assistente.
- **D-08:** Background gradients/effects that reference emerald should adapt to --color-primary.

### Plan Limit Enforcement
- **D-09:** Limits checked on BOTH backend (RPCs hard block) and frontend (UX soft block). RPCs return error when limit exceeded. Frontend shows progress indicator before limit is hit.
- **D-10:** UX when limit is hit: INLINE BANNER on the page ("Limite de 500 leads atingido (500/500). Contate o administrador.") + CREATE/ACTION BUTTON DISABLED. No modal, no redirect.
- **D-11:** Limits to enforce: max_leads (count of leads per expert), max_instancias (count of active whatsapp_rotacao per expert), max_envios_mes (count of mensagens WHERE direcao='enviada' this month per expert).
- **D-12:** Create a usePlanLimits hook that fetches current counts and max values. Returns { leads: {current, max, atLimit}, instancias: {current, max, atLimit}, envios: {current, max, atLimit} }.

### Feature Gating
- **D-13:** Features blocked by plan show as VISIBLE BUT DISABLED in sidebar — item appears grayed out with a lock icon. Clicking shows tooltip: "Disponível no plano Pro" (or relevant plan name).
- **D-14:** Feature-to-plan mapping based on features_permitidas JSONB array in planos table:
  - `agendamento` → Agendamentos page (all plans have this)
  - `torneio` → Torneios page (Pro + Enterprise)
  - `copy_ia` → Gerar Copy page (Pro + Enterprise)
  - `moderacao` → Moderação features (Enterprise only)
  - `voz_clonada` → Voice config (Enterprise only, but v2 feature — just gate the future page)
- **D-15:** Create a useFeatureGate hook that checks if current expert's plan includes a feature. Returns { hasFeature: boolean, requiredPlan: string }.
- **D-16:** Sidebar component reads features_permitidas and renders items accordingly (active vs disabled+locked).

### Claude's Discretion
- Exact Tailwind config for CSS Variables plugin
- How to generate --color-primary-bg (opacity calculation or fixed lighter shade)
- Order of replacing hardcoded colors (which files first)
- RPC implementation for limit checking
- Exact tooltip/popover component for locked features

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Styling
- `tailwind.config.js` — Current Tailwind config, needs primary color via CSS variable
- `src/index.css` — Global styles, :root CSS variables go here
- `src/components/Sidebar.tsx` — Expert sidebar, needs dynamic logo/name/colors/feature gating

### Auth & Expert Data
- `src/stores/authStore.ts` — Has user.expert with cor_primaria, cor_secundaria, logo_url, nome_plataforma, plano
- `src/types/index.ts` — ExpertProfile with all branding fields

### Pages that use emerald/green
- `src/pages/Dashboard.tsx` — Metric cards, charts with emerald colors
- `src/pages/Leads.tsx` — Status badges, buttons
- `src/components/MetricCard.tsx` — Card with emerald accents
- `src/components/LeadBadge.tsx` — Status color badges
- `src/components/PageHeader.tsx` — Header accents

### Plan Data
- `src/types/database.ts` — PlanoRow with features_permitidas
- Supabase planos table — max_leads, max_instancias, max_envios_mes, features_permitidas

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- authStore.ts — Already has full expert profile in session (cor_primaria, plano, etc.)
- MetricCard.tsx — Needs color migration from emerald to primary
- Sidebar.tsx — Needs logo/name/feature gating additions

### Established Patterns
- Tailwind for all styling — no CSS modules or styled-components
- Zustand for global state — usePlanLimits and useFeatureGate can be Zustand selectors or standalone hooks
- cn() utility for conditional classes

### Integration Points
- App.tsx — useEffect for applying CSS variables when user changes
- Sidebar.tsx — Dynamic logo, name, feature gating
- All pages/components with hardcoded emerald — systematic replacement
- RPCs for limit checking (new Supabase functions)

</code_context>

<specifics>
## Specific Ideas

- Initials circle for missing logo: 40px circle, cor_primaria background, white text, bold font
- Plan limit banner should show progress: "423/500 leads utilizados" even before hitting limit (informational)
- Disabled sidebar items should still show the page name (expert can see what they're missing)
- Color transition should be smooth (CSS transition on color properties) for impersonation switch

</specifics>

<deferred>
## Deferred Ideas

- "Helena" name substitution → Phase 5 (N8N workflows only, not frontend)

</deferred>

---

*Phase: 04-white-label-plan-enforcement*
*Context gathered: 2026-03-28*
