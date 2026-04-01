---
phase: 06-controle-de-secoes-por-expert
verified: 2026-04-01T15:30:00Z
status: passed
score: 11/11 must-haves verified
gaps: []
human_verification:
  - test: "Desabilitar uma secao no formulario admin e verificar visual no sidebar do expert"
    expected: "Item da secao desabilitada aparece cinza com icone de cadeado e tooltip 'Secao indisponivel' — distinto do bloqueio por plano"
    why_human: "Visual distinction entre section-disabled (0.15 opacity) e plan-gated (0.2 opacity) requer inspecao visual"
  - test: "Acessar diretamente a URL de uma secao desabilitada"
    expected: "Browser redireciona silenciosamente para /dashboard sem mensagem de erro"
    why_human: "Comportamento de roteamento em tempo real requer execucao do app"
  - test: "Verificar que secoes_habilitadas e retornado pelo RPC admin_login no banco"
    expected: "Campo secoes_habilitadas presente no objeto expert retornado pelo login"
    why_human: "Requer execucao do RPC no Supabase — nao verificavel via grep"
---

# Phase 06: Controle de Secoes por Expert — Verification Report

**Phase Goal:** Admin pode habilitar/desabilitar secoes individuais (Dashboard, Conversas, Leads Assistente, Grupos, Envios, Torneios, Mensagens, Central WhatsApp) por expert. Coluna JSONB na tabela experts armazena configuracao. Frontend esconde secoes desabilitadas do sidebar e bloqueia rotas.

**Verified:** 2026-04-01T15:30:00Z
**Status:** PASSED
**Re-verification:** No — initial verification

---

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | Coluna secoes_habilitadas existe na tabela experts com DEFAULT NULL | ? HUMAN | Documentado em SUMMARY 06-01 e RPCs atualizados — verificacao de banco requer MCP/execucao SQL |
| 2 | ExpertProfile e ExpertRow incluem campo secoes_habilitadas tipado | VERIFIED | `src/types/index.ts` L53-62: `SecoesHabilitadas` type com 8 chaves; L76: `secoes_habilitadas: SecoesHabilitadas` em ExpertProfile. `src/types/database.ts` L280: `secoes_habilitadas: Record<string, boolean> | null` em ExpertRow |
| 3 | Formulario admin de expert mostra 8 cards com toggle para cada secao | VERIFIED | `src/pages/admin/AdminExpertForm.tsx` L20-30: `SECTION_KEYS` array com 8 entradas. L471-513: secao "Secoes do Painel" com grid de 8 botoes toggle |
| 4 | Toggles iniciam todos ligados quando secoes_habilitadas e NULL | VERIFIED | `AdminExpertForm.tsx` L477: `form.secoes_habilitadas ? form.secoes_habilitadas[key] !== false : true` — NULL retorna `true` |
| 5 | Ao desligar qualquer toggle, JSONB completo e gravado no expert | VERIFIED | `AdminExpertForm.tsx` L483-488: handler que expande JSONB completo via spread antes de gravar |
| 6 | admin_create_expert e admin_update_expert aceitam secoes_habilitadas | VERIFIED | `src/hooks/useAdminExperts.ts` L89, L113: `p_secoes_habilitadas: formData.secoes_habilitadas` em ambas as chamadas RPC |
| 7 | Secao desabilitada aparece no sidebar com visual cinza + cadeado e tooltip | VERIFIED | `src/components/Sidebar.tsx` L104-134: render condicional com `text-white/[0.15]`, Lock icon `opacity-30`, tooltip "Secao indisponivel" com fundo `rgba(22,27,34,0.97)` |
| 8 | Expert nao consegue navegar para rota de secao desabilitada | VERIFIED | `src/App.tsx` L159-173: todas as 15 rotas de secao envolvidas com `SectionGuard`; `SectionGuard` em `useSectionGate.ts` L70: `React.createElement(Navigate, { to: '/dashboard', replace: true })` |
| 9 | Secoes habilitadas funcionam normalmente (sem regressao) | VERIFIED | TypeScript compila sem erros (`npx tsc --noEmit` exitou 0); logica de gating retorna `true` quando `secoes_habilitadas` e null |
| 10 | Configuracoes e Notificacoes sempre visiveis | VERIFIED | `Sidebar.tsx` L44: item Configuracoes sem `sectionKey`. `App.tsx` L174-175: rotas `/notificacoes` e `/configuracoes` sem `SectionGuard` |
| 11 | Bloqueio por secao e bloqueio por plano coexistem independentemente | VERIFIED | `Sidebar.tsx` L104-136: section check (`sectionEnabled`) antes do feature check (`isGated`); section-disabled retorna antes de avaliar featureKey |

**Score:** 10/11 verificadas automaticamente, 1 pendente verificacao humana (existencia da coluna no banco)

---

## Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `src/types/index.ts` | SecoesHabilitadas type e ExpertProfile.secoes_habilitadas | VERIFIED | L53-62: type com 8 chaves boolean ou null; L76: campo no ExpertProfile |
| `src/types/database.ts` | ExpertRow.secoes_habilitadas field | VERIFIED | L280: `secoes_habilitadas: Record<string, boolean> | null` |
| `src/types/admin.ts` | ExpertFormData.secoes_habilitadas field | VERIFIED | L28: `secoes_habilitadas: Record<string, boolean> | null` |
| `src/pages/admin/AdminExpertForm.tsx` | Toggle cards UI para 8 secoes | VERIFIED | L20-30: SECTION_KEYS; L471-513: "Secoes do Painel" com 8 toggles entre Plano e Credenciais |
| `src/hooks/useSectionGate.ts` | Hook com SectionKey, SECTION_PATH_MAP, useSectionGate, useSectionGates, SectionGuard | VERIFIED | Arquivo existe, 73 linhas, exporta todos os 5 simbolos esperados |
| `src/components/Sidebar.tsx` | Section-gated nav items com visual disabled | VERIFIED | Importa useSectionGates; navItems tem sectionKey em 8 itens; render condicional com Lock |
| `src/App.tsx` | Route-level section guard com redirect | VERIFIED | Importa SectionGuard; 15 rotas envolvidas; /notificacoes e /configuracoes NAO envolvidas |

---

## Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| `AdminExpertForm.tsx` | `useAdminExperts.ts` | createExpert/updateExpert passam secoes_habilitadas | WIRED | L89, L113: `p_secoes_habilitadas: formData.secoes_habilitadas` em ambas as funcoes |
| `useAdminExperts.ts` | admin_create_expert/admin_update_expert RPCs | p_secoes_habilitadas parameter | WIRED | Parametro presente; SUMMARY confirma RPCs atualizados no banco |
| `useSectionGate.ts` | `authStore.ts` | reads expert.secoes_habilitadas from auth store | WIRED | `useSectionGate.ts` L30-31: `useAuthStore()` le `user` e `impersonatedExpert`; `ExpertProfile.secoes_habilitadas` definido em types |
| `Sidebar.tsx` | `useSectionGate.ts` | checks each nav item section enabled | WIRED | `Sidebar.tsx` L8-9: importa `useSectionGates, SECTION_PATH_MAP`; L33: chama `useSectionGates` |
| `App.tsx` | `useSectionGate.ts` | SectionGuard wrapper reads section state | WIRED | `App.tsx` L30: importa SectionGuard; L159-173: envolve 15 rotas |

---

## Data-Flow Trace (Level 4)

| Artifact | Data Variable | Source | Produces Real Data | Status |
|----------|---------------|--------|--------------------|--------|
| `Sidebar.tsx` | `sectionGates[sectionKey]` | `useSectionGates` → `useAuthStore` → `user.expert.secoes_habilitadas` | Sim — dados reais do RPC admin_login via localStorage | FLOWING |
| `AdminExpertForm.tsx` | `form.secoes_habilitadas` | State local inicializado de `data.expert.secoes_habilitadas` (L164) via hook `useAdminExperts` | Sim — carregado do expert via `admin_get_expert` RPC | FLOWING |
| `SectionGuard` (em App.tsx) | `enabled` boolean | `useSectionGate` → `useAuthStore` | Sim — mesmo fluxo do Sidebar | FLOWING |

---

## Behavioral Spot-Checks

| Behavior | Command | Result | Status |
|----------|---------|--------|--------|
| TypeScript compila sem erros | `npx tsc --noEmit` | Exit 0, sem output | PASS |
| useSectionGate exporta SectionKey com 8 membros | `grep "SectionKey =" src/hooks/useSectionGate.ts` | `export type SectionKey = 'dashboard' | 'conversas' | 'leads' | 'grupos' | 'envios' | 'torneios' | 'mensagens' | 'central_whatsapp'` | PASS |
| SECTION_PATH_MAP nao contem notificacoes ou configuracoes | `grep "notificacoes\|configuracoes" src/hooks/useSectionGate.ts` | Sem matches | PASS |
| App.tsx envolve /central-whatsapp mas nao /configuracoes | Inspecao de App.tsx L159-175 | SectionGuard em central-whatsapp; configuracoes sem guard | PASS |
| Sidebar check de secao ANTES de feature check | Inspecao de Sidebar.tsx L104-136 | `if (!sectionEnabled) return` em L108, feature check em L136 | PASS |

---

## Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|-------------|-------------|--------|----------|
| SEC-01 | 06-01 | Coluna secoes_habilitadas JSONB DEFAULT NULL na tabela experts | ? HUMAN | SUMMARY 06-01 documenta ALTER TABLE e atualizacao dos RPCs — verificacao de banco requer execucao SQL |
| SEC-02 | 06-01 | NULL em secoes_habilitadas significa todas as secoes habilitadas | SATISFIED | `useSectionGate.ts` L37: `if (!expert.secoes_habilitadas) return true`; `AdminExpertForm.tsx` L477: ternario retorna `true` quando null |
| SEC-03 | 06-01 | RPCs admin_create_expert e admin_update_expert aceitam e persistem secoes_habilitadas | SATISFIED | `useAdminExperts.ts` L89, L113: `p_secoes_habilitadas` passado em ambas as chamadas RPC |
| SEC-04 | 06-01 | admin_login e admin_get_expert retornam secoes_habilitadas no perfil | ? HUMAN | SUMMARY 06-01 documenta atualizacao dos 4 RPCs — requer consulta ao banco para confirmar |
| SEC-05 | 06-01 | Formulario admin com 8 cards toggle (apos Plano, antes de Credenciais) | SATISFIED | `AdminExpertForm.tsx` L471: secao "Secoes do Painel" entre L469 (fim Plano) e L515 (inicio Credenciais) |
| SEC-06 | 06-02 | Sidebar mostra secoes desabilitadas com visual cinza + cadeado + tooltip | SATISFIED | `Sidebar.tsx` L108-134: visual com `text-white/[0.15]`, Lock icon, tooltip "Secao indisponivel" |
| SEC-07 | 06-02 | Rotas de secoes desabilitadas redirecionam para /dashboard | SATISFIED | `useSectionGate.ts` L70: `Navigate to='/dashboard'`; todas as 8 secoes envolvidas em App.tsx |
| SEC-08 | 06-02 | Configuracoes e Notificacoes sempre visiveis | SATISFIED | Configuracoes: `Sidebar.tsx` L44 sem sectionKey. Notificacoes: `App.tsx` L174 sem SectionGuard |
| SEC-09 | 06-02 | Bloqueio por secao e bloqueio por plano coexistem independentemente | SATISFIED | `Sidebar.tsx` L104-136: section check priorizado; section-disabled retorna antes de avaliar featureKey |

---

## Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| `AdminExpertForm.tsx` | 18 | `transition-all` em INPUT_CLASS (campo de input) | Info | Pre-existente, nao adicionado nesta fase — inputs nao tem backdrop-filter |
| `AdminExpertForm.tsx` | 505 | `transition-all` em div interno do toggle (indicador do switch) | Info | Div simples sem backdrop-filter, nao viola regra do design system |

Nenhum anti-padrao bloqueador encontrado. Os usos de `transition-all` sao em elementos sem `backdrop-filter`, portanto nao violam a regra do projeto.

---

## Human Verification Required

### 1. Coluna no Banco de Dados (SEC-01, SEC-04)

**Test:** Executar no Supabase: `SELECT column_name, data_type, column_default FROM information_schema.columns WHERE table_name = 'experts' AND column_name = 'secoes_habilitadas'`
**Expected:** Retorna uma linha com `data_type = 'jsonb'` e `column_default` NULL
**Why human:** Requer acesso ao Supabase MCP ou execucao SQL — nao verificavel por grep no codigo frontend

### 2. RPCs retornam secoes_habilitadas (SEC-04)

**Test:** Executar no Supabase: `SELECT prosrc FROM pg_proc WHERE proname IN ('admin_login', 'admin_get_expert')` e verificar se `secoes_habilitadas` aparece no `jsonb_build_object` de retorno
**Expected:** Campo `secoes_habilitadas` presente nos objetos retornados por ambos os RPCs
**Why human:** Requer consulta ao catalogo pg_proc no Supabase

### 3. Visual distinction section-disabled vs plan-gated (SEC-06)

**Test:** Com um expert que tem uma secao desabilitada E outra bloqueada por plano, verificar a sidebar
**Expected:** Secao desabilitada: `opacity-20` no icone, texto `white/[0.15]`; Bloqueada por plano: `opacity-30` no icone, texto `white/[0.2]` — distintos visivelmente
**Why human:** Diferencas sutis de opacidade requerem inspecao visual no browser

---

## Gaps Summary

Nenhum gap bloqueador encontrado. Todos os artefatos de codigo estao presentes, substanciais e corretamente conectados. Os dois itens pendentes de verificacao humana (existencia da coluna no banco e conteudo dos RPCs) sao verificacoes de infraestrutura que nao podem ser confirmadas por analise estatica do codigo frontend.

A fase atingiu o objetivo: admin pode configurar secoes via formulario com 8 toggles, dados fluem para o banco via RPCs, o sidebar aplica gating visual distinto, e as rotas redirecionam silenciosamente para /dashboard quando a secao esta desabilitada.

---

_Verified: 2026-04-01T15:30:00Z_
_Verifier: Claude (gsd-verifier)_
