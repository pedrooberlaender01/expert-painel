# Dashboard Leads — Multi-Tenant White-Label Platform

## What This Is

Plataforma SaaS multi-tenant white-label que permite a uma agência de automação gerenciar 5-15 experts independentes. Cada expert tem seu painel personalizado (cor, logo, persona, voz clonada) para captação e conversão de leads via WhatsApp, com funil automatizado, torneios, moderação de grupos e agendamento de mensagens em massa. Evolução do sistema single-tenant existente (1 expert: Allan Cabral) para plataforma multi-tenant com isolamento por `expert_id`.

## Core Value

Isolamento seguro de dados entre experts — um expert NUNCA pode ver, modificar ou interagir com dados de outro expert, enquanto a agência (admin master) tem visibilidade e controle total sobre todos.

## Requirements

### Validated

<!-- Shipped and confirmed valuable — existing features from current single-tenant system. -->

- ✓ Dashboard com métricas de leads (total, por status, conversões) — existing
- ✓ Gestão de leads com filtros, busca, edição e timeline — existing
- ✓ Funil automatizado via WhatsApp (coleta → convite → cadastro → grupo) — existing
- ✓ Mensagens de funil configuráveis (áudio/texto, variações, tempos) — existing
- ✓ Follow-ups automáticos por status com delays configuráveis — existing
- ✓ Rotação de números WhatsApp (múltiplas instâncias UAZAPI) — existing
- ✓ Central WhatsApp para gerenciar conexões de instâncias — existing
- ✓ Conversas com histórico de mensagens por lead — existing
- ✓ Moderação de grupos WhatsApp com IA (regras, strikes, expulsão) — existing
- ✓ Torneios de apostas (greens, participantes, análise de screenshots) — existing
- ✓ Agendamento de mensagens em massa para grupos (WhatsApp + Telegram) — existing
- ✓ Geração de copy com IA baseada no perfil do expert — existing
- ✓ Blacklist de grupos — existing
- ✓ Simulador de envios — existing

### Active

<!-- Multi-tenant transformation scope — v1 milestone. -->

- ✓ Sistema multi-tenant com coluna `expert_id` em todas as tabelas relevantes — Validated in Phase 1
- ✓ RLS policies no Supabase filtrando por `expert_id` em todas as queries — Validated in Phase 2 (transition mode)
- ✓ Tabela `experts` com dados de personalização (cor, logo, nome, persona, voice_id) — Validated in Phase 1
- ✓ Tabela `planos` com limites editáveis (leads, instâncias, envios/mês, features) — Validated in Phase 1
- ✓ Auth customizada multi-tenant (expert_id vinculado ao login, role: expert/admin) — Validated in Phase 2
- [ ] White-label via CSS Variables (--color-primary, --color-primary-hover, --color-primary-bg)
- [ ] Logo e nome da plataforma dinâmicos no sidebar por expert
- [ ] Nome da assistente configurável por expert (hoje "Helena")
- ✓ Painel admin master em rota /admin dentro do mesmo app React — Validated in Phase 3
- ✓ Admin master: CRUD de experts (criar, editar, suspender) — Validated in Phase 3
- ✓ Admin master: Dashboard global com métricas consolidadas de todos experts — Validated in Phase 3
- ✓ Admin master: Gestão de planos (criar, editar limites e features por plano) — Validated in Phase 3
- ✓ Admin master: Impersonação de expert (operar como qualquer expert para debug) — Validated in Phase 3
- [ ] Instâncias UAZAPI por expert (agência provisiona, expert gerencia dentro do limite)
- [ ] Workflows n8n compartilhados com filtro por expert_id + config por expert
- [ ] Webhooks n8n validam que expert_id do payload corresponde ao token UAZAPI
- ✓ Migração dos 1762 leads existentes + dados para expert_id do Allan (Expert #1) — Validated in Phase 1
- [ ] Voice settings por expert (voice_id Minimax, speed, pitch, timbre, vol como JSONB)
- ✓ Rate limiting no login (delay progressivo contra brute force) — Validated in Phase 2
- ✓ Sessão com expiração (24h no localStorage) — Validated in Phase 2
- ✓ CSP headers via meta tags no index.html — Validated in Phase 2
- [ ] Console.log removidos no build de produção (esbuild drop)
- [ ] Inputs sanitizados contra XSS em toda a aplicação
- [ ] Nenhuma chave sensível exposta no frontend (service_role, tokens UAZAPI, API keys)
- [ ] Validação server-side nas RPCs (não confiar só no frontend)
- [ ] Enforcement de limites do plano (bloquear ações quando limite atingido)

### Out of Scope

- Domínio próprio por expert — todos usam o mesmo domínio, diferenciados pelo login
- CSS/tema totalmente customizado por expert — layout, fontes, cores de superfície são iguais para todos
- Clonagem de voz self-service — voice_id é configurado manualmente pelo admin (feature futura Sprint 4-5)
- Supabase Auth nativo — manter auth customizada (admin_users com senha_hash)
- Workflows clonados por expert no n8n — usar workflows compartilhados com filtro
- App separada para admin master — integrado como rota /admin no mesmo SPA
- Billing/pagamento integrado — planos são gerenciados manualmente pelo admin
- Multi-idioma — interface em português apenas

## Context

### Current State

- **Stack:** React 19 + TypeScript + Vite + Tailwind CSS + Supabase + n8n
- **Database:** 25 tabelas no Supabase (projeto `albdkqpvoyfhziozgwlk`), zero colunas `expert_id`
- **Auth:** Tabela `admin_users` com 3 registros, `senha_hash` customizado, Zustand store
- **RLS:** Todas as policies são `qual: true` (acesso aberto) — zero isolamento real
- **N8N:** 31 workflows (19 ativos), servidor em `n8n-gend.srv1431760.hstgr.cloud`
- **WhatsApp:** 6 instâncias UAZAPI em `whatsapp_rotacao`, sem separação por tenant
- **Deploy:** GitHub Pages com HashRouter, build output em `docs/`
- **UI:** Dark theme glassmorphism, cor primária #10b981 (verde), fontes Inter/Outfit/JetBrains Mono

### Business Context

- Agência opera com 1 expert (Allan Cabral) no nicho de apostas esportivas
- Leads vêm de Instagram e Facebook (tráfego pago)
- Assistente "Helena" atende via WhatsApp com voz clonada (Minimax)
- Funil: lead chega → coleta nome → convida → cadastro → grupo
- Meta: escalar para 5-15 experts independentes na mesma plataforma

### Minimax Voice API

- TTS: `POST https://api.minimax.io/v1/t2a_async_v2` (model: speech-2.8-hd)
- Clone: `POST https://api.minimax.io/v1/voice_clone`
- Upload: `POST https://api.minimax.io/v1/files/upload`
- Cada expert terá `voice_id` + settings (speed, pitch, timbre, vol) em JSONB

### Planos de Acesso

| Plano | Leads | Instâncias | Envios/mês | Features |
|-------|-------|------------|------------|----------|
| Básico | 500 | 2 | 1.000 | Agendamento |
| Pro | 2.000 | 5 | 5.000 | + Torneio + Copy IA |
| Enterprise | Ilimitado | 10 | Ilimitado | Todas |

Valores editáveis pelo admin master, não hardcoded.

### Onboarding de Expert

1. Admin master cria expert no painel (nome, cor, logo, plano)
2. Admin cria instâncias UAZAPI e atribui ao expert
3. Admin configura webhook das instâncias apontando pro n8n
4. Admin cria usuário de acesso pro expert (email + senha)
5. Expert faz login e já vê seu painel personalizado
6. Voice_id é configurado manualmente por enquanto

## Constraints

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

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Auth customizada (não Supabase Auth) | Sistema existente funciona, migração de auth seria disruptiva | — Pending |
| Workflows n8n compartilhados + config por expert | Mais simples que clonar, expert_id filtra nos nodes Supabase | — Pending |
| Admin master no mesmo SPA (/admin) | Menos overhead, compartilha componentes, deploy único | — Pending |
| CSS Variables para white-label | Sobrescreve no login, sem rebuild por expert, zero overhead | — Pending |
| Migração incremental | Sistema continua funcionando, menos risco, validação gradual | — Pending |
| Minimax para voz clonada | Já em uso, speech-2.8-hd, voice_id por expert | — Pending |
| Planos editáveis pelo admin | Flexibilidade sem deploy, stored no Supabase | — Pending |
| Agência provisiona + expert gerencia instâncias | Controle central com autonomia limitada ao plano | — Pending |

## Evolution

This document evolves at phase transitions and milestone boundaries.

**After each phase transition** (via `/gsd:transition`):
1. Requirements invalidated? → Move to Out of Scope with reason
2. Requirements validated? → Move to Validated with phase reference
3. New requirements emerged? → Add to Active
4. Decisions to log? → Add to Key Decisions
5. "What This Is" still accurate? → Update if drifted

**After each milestone** (via `/gsd:complete-milestone`):
1. Full review of all sections
2. Core Value check — still the right priority?
3. Audit Out of Scope — reasons still valid?
4. Update Context with current state

---
*Last updated: 2026-03-28 after Phase 3 completion — Admin Master Panel*
