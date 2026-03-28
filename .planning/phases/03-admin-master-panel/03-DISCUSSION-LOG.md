# Phase 3: Admin Master Panel - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-03-27
**Phase:** 03-admin-master-panel
**Areas discussed:** Layout do /admin, CRUD de experts, Dashboard global, Impersonação

---

## Layout do /admin

| Option | Description | Selected |
|--------|-------------|----------|
| Sidebar própria para admin | Sidebar separada com itens admin. Mesma estética dark/glassmorphism. | ✓ |
| Reutilizar sidebar + seção admin | Sidebar existente com seção extra 'Admin'. | |
| Tab-based dentro de /admin | Página única com tabs. | |

**User's choice:** Sidebar própria para admin
**Navigation:** Experts, Planos, Dashboard Global (3 items, sem Configurações)

---

## CRUD de experts

| Option | Description | Selected |
|--------|-------------|----------|
| Página dedicada | Rota /admin/experts/new e /edit. Mais espaço. | ✓ |
| Modal/drawer lateral | Drawer sobre a lista. | |
| Inline na tabela | Edição direto na tabela. | |

**Color picker:** Paleta curada + custom hex
**Logo upload:** Supabase Storage (upload para bucket, URL pública)
**Credenciais:** No mesmo formulário do expert (email + senha junto)

---

## Dashboard global

**Métricas selecionadas:** Total de leads, Envios do mês, Experts ativos/total, Instâncias conectadas (todas 4 opções)

| Option | Description | Selected |
|--------|-------------|----------|
| Tabela com ranking | Tabela ordenável: expert, leads, envios, instâncias, plano, status | ✓ |
| Cards por expert | Card por expert com mini-métricas | |
| Você decide | Claude escolhe | |

**User's choice:** Tabela com ranking (ordenável)

---

## Impersonação

| Option | Description | Selected |
|--------|-------------|----------|
| Botão na lista de experts | Botão "Ver como expert" na tabela. | ✓ |
| Dropdown no header | Seletor de expert no header admin. | |
| Rota /admin/impersonate/:id | Rota dedicada com banner. | |

**Banner:** Fixo no topo, barra colorida com "Você está vendo como [Expert Name] — Sair"

---

## Claude's Discretion

- Admin sidebar component structure
- Table component implementation
- Form validation UX
- Loading/error states
- Metric aggregation SQL queries

## Deferred Ideas

None
