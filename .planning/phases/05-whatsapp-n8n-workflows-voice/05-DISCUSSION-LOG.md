# Phase 5: WhatsApp, N8N Workflows & Voice - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.

**Date:** 2026-03-28
**Phase:** 05-whatsapp-n8n-workflows-voice
**Areas discussed:** WhatsApp isolation, N8N workflows, Voice Minimax, Nome assistente

---

## Isolação de instâncias WhatsApp

**Rotação:** Filtrar por expert_id (hook + config). Cada expert cicla só seus números.
**Webhooks:** Lookup por instância no n8n (não precisa mudar UAZAPI metadata).

## Adaptação workflows n8n

**Estratégia:** Atualizar in-place gradualmente (1 expert, sem risco).
**Escopo:** Só 6 workflows prioritários (não todos 19).
**Configurações:** Manter tabela configuracoes com expert_id, duplicar rows para novos experts.

## Integração de voz Minimax

**Onde gera áudio:** N8N workflows (não frontend).
**Fallback:** Sem voice_id = opções de áudio DESABILITADAS no funil (sem fallback voice).

## Nome da assistente (WLBL-06)

**Onde "Helena" aparece:** Só nos workflows n8n (não no banco nem frontend).
**Solução:** Workflows leem nome_assistente do expert e substituem.

## Deferred

None — final phase.
