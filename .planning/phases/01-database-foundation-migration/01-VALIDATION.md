---
phase: 1
slug: database-foundation-migration
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-27
---

# Phase 1 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Supabase SQL (execute_sql MCP tool) |
| **Config file** | none — validation via SQL queries |
| **Quick run command** | `SELECT count(*) FROM experts; SELECT count(*) FROM planos;` |
| **Full suite command** | Run all validation queries below |
| **Estimated runtime** | ~5 seconds |

---

## Sampling Rate

- **After every task commit:** Run quick validation SQL
- **After every plan wave:** Run full validation suite
- **Before `/gsd:verify-work`:** Full suite must pass
- **Max feedback latency:** 10 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 01-01-01 | 01 | 1 | MTNT-01 | sql | `SELECT * FROM experts LIMIT 1` | N/A | pending |
| 01-01-02 | 01 | 1 | MTNT-02 | sql | `SELECT * FROM planos LIMIT 1` | N/A | pending |
| 01-02-01 | 02 | 1 | MTNT-03 | sql | `SELECT column_name FROM information_schema.columns WHERE table_name='leads' AND column_name='expert_id'` | N/A | pending |
| 01-02-02 | 02 | 1 | MTNT-05 | sql | `SELECT indexname FROM pg_indexes WHERE tablename='leads' AND indexdef LIKE '%expert_id%'` | N/A | pending |
| 01-03-01 | 03 | 2 | MTNT-04 | sql | `SELECT count(*) FROM leads WHERE expert_id IS NOT NULL` | N/A | pending |
| 01-03-02 | 03 | 2 | MTNT-04 | sql | `SELECT count(*) FROM leads WHERE expert_id IS NULL` (must be 0) | N/A | pending |

*Status: pending / green / red / flaky*

---

## Wave 0 Requirements

*Existing infrastructure covers all phase requirements — pure SQL migrations, no test framework needed.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| App continues functioning after migration | MTNT-04 | Requires running app and navigating pages | Load dashboard, leads page, conversas — verify no errors |

---

## Validation Sign-Off

- [ ] All tasks have automated SQL verification
- [ ] Sampling continuity: every migration step has a validation query
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 10s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
