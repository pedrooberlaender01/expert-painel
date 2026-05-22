# Quick Task 260406-luw: Fix modal Adicionar Grupo

## Problema
O modal "Adicionar Grupo" (Moderação > Grupos Monitorados) chamava o webhook `buscar-grupos` esperando uma lista de `{ Name, JID }[]` para selecionar grupos. Porém, o webhook foi atualizado para inserir os grupos diretamente no Supabase e retornar `{ sucesso: true, total: N }`. O frontend ficava carregando indefinidamente por:

1. **Timeout curto** — `fetchWithTimeout` tinha timeout de 30s, mas o webhook pode levar 30s+ para inserir 50 grupos
2. **Formato de resposta incompatível** — O frontend esperava array de grupos, recebia objeto `{ sucesso, total }`
3. **Falta de `expert_id`** — Sem o `expert_id`, os grupos inseridos não ficavam visíveis pela RLS
4. **Modal não fechava e lista não recarregava** — Não havia lógica para fechar o modal e dar refetch após sucesso

## Alterações

### `src/hooks/useModeracao.ts`
- `fetchGruposWhatsapp`: Alterado retorno de `{ Name, JID }[]` para `{ sucesso, mensagem?, total? }`
- Timeout aumentado de 30s para 60s
- `expert_id` adicionado ao body (feito na sessão anterior)

### `src/pages/Grupos.tsx`
- `AddGroupModal`: Simplificado para fluxo de um passo (selecionar instância → buscar)
- Removida a lista de seleção de grupos (webhook insere todos diretamente)
- Removido o botão "+ Adicionar" (webhook faz a inserção)
- Adicionado `onRefetch` para recarregar a lista de grupos monitorados após sucesso
- Modal fecha automaticamente após sucesso com toast de feedback
- Mensagem de loading informativa durante a busca
- Removida prop `onAdd` que não é mais necessária

## Verificação
- `npx tsc --noEmit` — passa sem erros
