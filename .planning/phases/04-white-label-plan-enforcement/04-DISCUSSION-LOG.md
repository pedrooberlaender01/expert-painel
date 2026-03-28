# Phase 4: White-Label & Plan Enforcement - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.

**Date:** 2026-03-28
**Phase:** 04-white-label-plan-enforcement
**Areas discussed:** Migração de cores, Sidebar dinâmica, Enforcement de limites, Feature gating

---

## Migração de cores hardcoded

| Option | Description | Selected |
|--------|-------------|----------|
| Tailwind CSS Variables plugin | Define primary as var(--color-primary) in tailwind.config. Native bg-primary, text-primary classes. | ✓ |
| CSS Variables + replace classes | Manual :root variables + custom @apply classes | |
| Inline styles | style={{ color: var(--color-primary) }} | |

**Timing:** App.tsx useEffect watching authStore (handles login + impersonation)

## Sidebar dinâmica

**Logo fallback:** Iniciais do expert em círculo (cor_primaria background)
**"Helena":** Só aparece no funil via n8n — Phase 5 (não frontend)

## Enforcement de limites

**Checagem:** Backend (RPCs hard block) + Frontend (UX soft block)
**UX bloqueio:** Banner inline + botão desabilitado ("Limite de 500 leads atingido")

## Feature gating

**Apresentação:** Item visível mas desabilitado (esmaecido + cadeado + tooltip)
**Mapeamento:** Conforme features_permitidas do plano (agendamento, torneio, copy_ia, moderacao, voz_clonada)

## Deferred

- "Helena" substitution → Phase 5
