# Phase 6: Controle de Secoes por Expert - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-04-01
**Phase:** 06-controle-de-secoes-por-expert
**Areas discussed:** Estrutura de dados, Interação com plano, UI do admin, Comportamento no frontend

---

## Estrutura de dados

### Formato da coluna

| Option | Description | Selected |
|--------|-------------|----------|
| JSONB objeto | Coluna `secoes_habilitadas` JSONB tipo {"dashboard": true, ...}. Cada seção é uma chave boolean. | ✓ |
| Array de strings | TEXT[] com nomes das seções ativas. Ausência = desabilitada. | |
| JSONB array | JSONB como array ["dashboard","conversas",...]. Similar ao features_permitidas. | |

**User's choice:** JSONB objeto
**Notes:** Formato mais explícito e fácil de ler/gravar.

### Default para experts

| Option | Description | Selected |
|--------|-------------|----------|
| Tudo habilitado | DEFAULT com todas as 8 seções true. Migration seta para existentes. | |
| NULL = tudo habilitado | NULL significa todas visíveis (padrão Enterprise). Só grava quando customiza. | ✓ |

**User's choice:** NULL = tudo habilitado
**Notes:** Consistente com o padrão features_permitidas do plano.

---

## Interação com plano

| Option | Description | Selected |
|--------|-------------|----------|
| Plano ganha | Seção habilitada + bloqueada pelo plano = continua bloqueada. Controle só REMOVE. | |
| Seção ganha | Dois sistemas independentes. Desabilitou seção = some. Habilitou = plano pode mostrar cadeado. | ✓ |
| Substituir plano | secoes_habilitadas substitui features_permitidas completamente. | |

**User's choice:** Seção ganha (dois sistemas independentes)
**Notes:** Seção controla visibilidade, plano controla acesso à feature dentro da seção.

---

## UI do admin

### Tipo de controle

| Option | Description | Selected |
|--------|-------------|----------|
| Toggle switches | Lista de toggles on/off. Visual limpo. | |
| Checkboxes grid | Grid 2x4 com ícones. Mais compacto. | |
| Card com toggle | Cards pequenos com ícone + nome + toggle. Mais visual. | ✓ |

**User's choice:** Card com toggle
**Notes:** Cards com ícone de cada seção + nome + toggle switch.

### Posição no formulário

| Option | Description | Selected |
|--------|-------------|----------|
| Após Plano | Depois da seleção de plano, antes de Credenciais. | ✓ |
| No final | Após todas as seções existentes. | |
| Após Cores/Logo | Agrupando com personalização visual. | |

**User's choice:** Após Plano
**Notes:** Lógico: define plano primeiro, depois refina seções.

---

## Comportamento no frontend

### Seção desabilitada no sidebar

| Option | Description | Selected |
|--------|-------------|----------|
| Some completamente | Item não aparece no sidebar. Expert nem sabe que existe. | |
| Mostra desabilitada | Aparece com visual bloqueado (cinza + cadeado). Expert vê mas não acessa. | ✓ |

**User's choice:** Mostra desabilitada
**Notes:** Expert vê que a seção existe mas está bloqueada.

### Acesso direto pela URL

| Option | Description | Selected |
|--------|-------------|----------|
| Redireciona pro dashboard | Silenciosamente redireciona sem mensagem. | ✓ |
| Mostra página bloqueada | Renderiza overlay com mensagem "Seção desabilitada". | |

**User's choice:** Redireciona pro dashboard
**Notes:** Redirect silencioso, sem mensagem de erro.

---

## Claude's Discretion

- Hook/utility para checar seções habilitadas
- Nomes internos das chaves JSONB
- Integração com RPCs admin existentes

## Deferred Ideas

Nenhuma — discussão ficou dentro do escopo da fase.
