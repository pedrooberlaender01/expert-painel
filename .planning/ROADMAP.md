# Roadmap: Dashboard Leads — Multi-Tenant White-Label

## Overview

Transform the existing single-tenant dashboard into a multi-tenant white-label platform. The migration is incremental — the system must keep working throughout. The journey starts with database schema changes (expert_id everywhere), builds security isolation (RLS + auth), adds the admin master panel for expert management, delivers white-label personalization with plan enforcement, and closes with WhatsApp/N8N multi-tenant integration and voice settings.

## Phases

**Phase Numbering:**
- Integer phases (1, 2, 3): Planned milestone work
- Decimal phases (2.1, 2.2): Urgent insertions (marked with INSERTED)

Decimal phases appear between their surrounding integers in numeric order.

- [ ] **Phase 1: Database Foundation & Migration** - Add expert_id to all tables, create experts/planos tables, migrate existing data
- [ ] **Phase 2: Auth & Security Hardening** - Multi-tenant auth with roles, RLS policies on all tables, security best practices
- [ ] **Phase 3: Admin Master Panel** - Expert CRUD, global dashboard, plan management, impersonation, instance assignment
- [ ] **Phase 4: White-Label & Plan Enforcement** - CSS variables, dynamic branding per expert, plan limit enforcement across the app
- [ ] **Phase 5: WhatsApp, N8N Workflows & Voice** - Multi-tenant WhatsApp instances, n8n workflow updates, voice settings per expert

## Phase Details

### Phase 1: Database Foundation & Migration
**Goal**: Every table in the system is tenant-aware with expert_id, and all existing data belongs to Expert #1 (Allan)
**Depends on**: Nothing (first phase)
**Requirements**: MTNT-01, MTNT-02, MTNT-03, MTNT-04, MTNT-05
**Success Criteria** (what must be TRUE):
  1. Tables `experts` and `planos` exist in Supabase with all specified columns and at least one expert record (Allan) and three plan records (Basico, Pro, Enterprise)
  2. Every relevant table has an `expert_id` column (UUID, NOT NULL, FK to experts.id) with an index on it
  3. All 1762 existing leads and their related data have been migrated to Allan's expert_id with zero data loss
  4. Existing application continues to function after migration (no broken queries)
**Plans**: 3 plans

Plans:
- [x] 01-01: Create experts and planos tables, seed Allan as Expert #1
- [x] 01-02: Add expert_id column to all 26 relevant tables with indexes
- [x] 01-03: Migrate existing data to Expert #1 and validate integrity

### Phase 2: Auth & Security Hardening
**Goal**: Users authenticate with roles (admin/expert), sessions are secure, and RLS prevents any cross-tenant data access
**Depends on**: Phase 1
**Requirements**: AUTH-01, AUTH-02, AUTH-03, AUTH-04, AUTH-05, AUTH-06, AUTH-07, AUTH-08, AUTH-09, AUTH-10, AUTH-11, AUTH-12
**Success Criteria** (what must be TRUE):
  1. Admin user can log in and is redirected to /admin; expert user can log in and sees only their own data
  2. A logged-in expert cannot access another expert's leads, messages, or any other data — not via the UI, not via direct Supabase API calls with the anon key
  3. Login has progressive rate limiting (delays increase after failed attempts) and sessions expire after 24 hours
  4. No sensitive keys (service_role, UAZAPI tokens, Minimax API keys) are present in the frontend bundle or network responses to the browser
  5. All user inputs are sanitized against XSS, CSP headers are set, and console.log is stripped from production builds
**Plans**: 3 plans

Plans:
- [x] 02-01: Extend auth system with roles (admin/expert) and expert_id session binding
- [x] 02-02: Create RLS policies for all tables filtering by expert_id
- [x] 02-03: Security hardening (rate limiting, XSS sanitization, CSP, secret removal, server-side RPC validation)

### Phase 3: Admin Master Panel
**Goal**: Agency admin can create and manage experts, configure plans, view global metrics, and impersonate any expert for debugging
**Depends on**: Phase 2
**Requirements**: ADMN-01, ADMN-02, ADMN-03, ADMN-04, ADMN-05, ADMN-06, ADMN-07, ADMN-08, ADMN-09, ADMN-10, ADMN-11, PLAN-01, PLAN-02, PLAN-03, PLAN-08
**Success Criteria** (what must be TRUE):
  1. Admin can access /admin route; non-admin users are blocked from this route
  2. Admin can create a new expert (name, colors, logo, plan, assistant name), edit any expert's data, and suspend/reactivate experts
  3. Admin can create login credentials for an expert and the expert can then log in successfully
  4. Admin dashboard shows consolidated metrics across all experts with per-expert breakdown
  5. Admin can create/edit plans with configurable limits (leads, instances, sends/month, features) and the three default plans (Basico, Pro, Enterprise) exist with correct values
  6. Admin can impersonate any expert (see the panel as the expert sees it) and can assign/remove UAZAPI instances and configure voice_id per expert
**Plans**: 3 plans
**UI hint**: yes

Plans:
- [x] 03-01: Admin route protection and layout scaffold
- [x] 03-02: Expert CRUD (create, edit, suspend, user credentials)
- [x] 03-03: Global dashboard, plan management, impersonation, instance/voice assignment

### Phase 4: White-Label & Plan Enforcement
**Goal**: Each expert sees a personalized dashboard (their colors, logo, assistant name) and plan limits are actively enforced throughout the application
**Depends on**: Phase 3
**Requirements**: WLBL-01, WLBL-02, WLBL-03, WLBL-04, WLBL-05, WLBL-06, WLBL-07, WLBL-08, PLAN-04, PLAN-05, PLAN-06, PLAN-07
**Success Criteria** (what must be TRUE):
  1. When an expert logs in, the UI primary color changes to their configured color (not hardcoded #10b981) via CSS Variables
  2. The sidebar shows the expert's logo and platform name instead of "Allan Cabral / AUTOMACOES"
  3. Where "Helena" appears in funnel messages, it shows the expert's configured assistant name instead
  4. An expert on Plano Basico is blocked from creating more than 500 leads, connecting more than 2 instances, and sending more than 1000 messages/month, with a clear visual indicator showing the limit
  5. Features restricted by plan (e.g., Torneio, Copy IA) show "Disponivel no plano Pro" for experts without access
**Plans**: 3 plans
**UI hint**: yes

Plans:
- [x] 04-01: CSS Variables system and dynamic theme application on login
- [x] 04-02: White-label components (sidebar logo/name, assistant name, gradient adaptation)
- [x] 04-03: Plan limit enforcement across all features with visual indicators

### Phase 5: WhatsApp, N8N Workflows & Voice
**Goal**: WhatsApp instances are isolated per expert, n8n workflows filter by expert_id, and each expert's voice settings are used for audio generation
**Depends on**: Phase 2 (RLS must be in place)
**Requirements**: WAPP-01, WAPP-02, WAPP-03, WAPP-04, WAPP-05, WAPP-06, N8N-01, N8N-02, N8N-03, N8N-04, N8N-05, N8N-06, VOIC-01, VOIC-02, VOIC-03, VOIC-04
**Success Criteria** (what must be TRUE):
  1. Each expert sees only their own WhatsApp instances in Central WhatsApp and can connect/disconnect within their plan limit
  2. Number rotation only cycles through instances belonging to the same expert
  3. N8N workflows (Boas vindas, Follow up, Envio Mensagem) correctly filter by expert_id and use the correct expert's UAZAPI tokens
  4. Webhook payloads carry expert_id and n8n validates that the expert_id matches the UAZAPI token that triggered the webhook
  5. Audio generation in the funnel uses the expert's voice_id and voice_settings; if no voice_id is configured, it falls back to the system default voice
**Plans**: 3 plans

Plans:
- [ ] 05-01: WhatsApp instance isolation and expert-scoped management
- [ ] 05-02: N8N workflow updates for multi-tenant filtering and token routing
- [ ] 05-03: Voice settings per expert and audio workflow integration

## Progress

**Execution Order:**
Phases execute in numeric order: 1 → 2 → 3 → 4 → 5

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. Database Foundation & Migration | 2/3 | In progress | - |
| 2. Auth & Security Hardening | 0/3 | Not started | - |
| 3. Admin Master Panel | 0/3 | Not started | - |
| 4. White-Label & Plan Enforcement | 0/3 | Not started | - |
| 5. WhatsApp, N8N Workflows & Voice | 0/3 | Not started | - |
