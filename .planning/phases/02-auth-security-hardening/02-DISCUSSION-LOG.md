# Phase 2: Auth & Security Hardening - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-03-27
**Phase:** 02-auth-security-hardening
**Areas discussed:** RLS com auth customizada, Modelo de roles e sessão, Secrets e webhooks, XSS/CSP e build security

---

## RLS com auth customizada

| Option | Description | Selected |
|--------|-------------|----------|
| RPC-only access | Frontend chama APENAS RPCs. RPCs recebem expert_id e validam server-side. RLS como segunda camada via set_config. | ✓ |
| Custom JWT via Edge Function | Edge Function gera JWT customizado com expert_id no login. RLS lê do JWT. | |
| Service role + proxy | Edge Function como proxy. Frontend nunca fala direto com Supabase. | |

**User's choice:** RPC-only access
**Notes:** Recomendado por manter auth customizada sem necessidade de JWT customizado.

| Option | Description | Selected |
|--------|-------------|----------|
| Admin bypassa RLS via service_role | RPCs de admin usam service_role internamente. | ✓ |
| Admin tem flag especial no JWT/session | RLS reconhece role=admin. | |
| Você decide | Claude escolhe. | |

**User's choice:** Admin bypassa RLS via service_role

| Option | Description | Selected |
|--------|-------------|----------|
| Migrar queries para RPCs gradualmente | Criar RPCs que fazem set_config + query. Hook por hook. | ✓ |
| RLS com app_metadata no anon | Login RPC seta variável de sessão. Queries diretas já filtradas. | |
| Bloquear acesso direto às tabelas | Revogar SELECT do anon. Só RPCs. | |

**User's choice:** Migrar queries para RPCs gradualmente

---

## Modelo de roles e sessão

| Option | Description | Selected |
|--------|-------------|----------|
| Adicionar role + expert_id ao admin_users | ALTER TABLE admin_users ADD role TEXT, ADD expert_id UUID. | ✓ |
| Tabela separada para experts login | Manter admin_users para admins, criar expert_users. | |
| Você decide | Claude escolhe. | |

**User's choice:** Adicionar role + expert_id ao admin_users

| Option | Description | Selected |
|--------|-------------|----------|
| User + role + expert completo | Guardar user + role + expert_id + expert profile completo na sessão. | ✓ |
| User + role + expert_id apenas | Guardar mínimo, buscar expert sob demanda. | |
| Você decide | Claude escolhe. | |

**User's choice:** User + role + expert completo

---

## Secrets e webhooks

| Option | Description | Selected |
|--------|-------------|----------|
| Mover webhooks para RPCs/Edge Functions | Frontend chama RPC. RPC faz fetch para n8n. | |
| Proxy via Edge Function | Edge Function genérica de proxy. | |
| Manter URLs no frontend, proteger só tokens | Webhook URLs públicos, tokens UAZAPI server-side via RPCs. | ✓ |

**User's choice:** Manter URLs no frontend, proteger só tokens
**Notes:** Webhook URLs são considerados públicos. N8N valida via headers. Tokens UAZAPI e API keys nunca no frontend.

---

## XSS, CSP e build security

| Option | Description | Selected |
|--------|-------------|----------|
| DOMPurify nos inputs | Sanitizar no frontend com DOMPurify. | |
| Sanitização no backend (RPCs) | Sanitizar no Supabase antes de gravar. | ✓ |
| Ambos | Frontend + backend sanitization. | |

**User's choice:** Sanitização no backend (RPCs)

| Option | Description | Selected |
|--------|-------------|----------|
| Básico | default-src 'self', unsafe-inline para Tailwind, connect-src para Supabase/n8n. | ✓ |
| Restritivo | Nonces, sem unsafe-inline, report-uri. | |
| Você decide | Claude escolhe. | |

**User's choice:** Básico

---

## Claude's Discretion

- RLS policy SQL implementation details
- set_config call pattern structure in RPCs
- Hook migration priority order
- Exact CSP connect-src domains

## Deferred Ideas

None — discussion stayed within phase scope
