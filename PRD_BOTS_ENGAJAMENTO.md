# PRD — Bots de Engajamento em Grupos WhatsApp

## Visão Geral

Sistema de bots humanizados que atuam como membros reais nos grupos WhatsApp do expert. Cada bot tem uma persona configurável (nome, foto, tom de voz, horários, comportamento) e interage contextualmente com foco exclusivo em **roleta e o contexto do expert**. Os bots reagem a mensagens do expert, quebram silêncio, e futuramente conversam entre si.

**Regra crítica:** Claude Code NÃO deve modificar nenhum workflow n8n existente. Apenas criar novos.

---

## Arquitetura Geral

```
┌─────────────────────────────────────────────────────┐
│                    FRONTEND                          │
│  Grupos > Aba "Bots" (ao lado de Moderação)         │
│  ├── Personas (biblioteca)                          │
│  ├── Grupos Ativos (config por grupo)               │
│  ├── Base de Conhecimento (RAG)                     │
│  ├── Templates de Persona                           │
│  └── Métricas                                       │
└──────────────┬──────────────────────────────────────┘
               │ webhooks
┌──────────────▼──────────────────────────────────────┐
│                    N8N (novos workflows)             │
│  1. Bot Engine (schedule + webhook trigger)         │
│  2. Bot Onboarding (conectar + adicionar a grupo)   │
│  3. Cache de Contexto (últimas 50 msgs por grupo)   │
└──────────────┬──────────────────────────────────────┘
               │
┌──────────────▼──────────────────────────────────────┐
│              SUPABASE + REDIS + UAZAPI              │
│  Tabelas novas, RAG embeddings, cache msgs          │
└─────────────────────────────────────────────────────┘
```

---

## FASE 1 — Banco de Dados (Supabase)

### Objetivo
Criar todas as tabelas, RLS policies, RPCs e triggers necessários.

### Tabelas Novas

#### `bot_personas`
Biblioteca reutilizável de personas. Cada persona é um "personagem" com identidade e comportamento.

| Coluna | Tipo | Default | Notas |
|--------|------|---------|-------|
| id | uuid | gen_random_uuid() | PK |
| nome | text | | NOT NULL — nome exibido no WhatsApp |
| foto_url | text | | nullable — URL da foto de perfil |
| idade | integer | | nullable |
| cidade | text | | nullable |
| profissao | text | | nullable |
| tom_voz | text | 'casual' | CHECK: muito_informal, casual, neutro, animado |
| girias | jsonb | '[]' | Array de gírias que usa |
| emojis_favoritos | jsonb | '[]' | Array de emojis que usa |
| exemplos_frases | jsonb | '[]' | Array de frases exemplo (few-shot) |
| horario_inicio | time | '08:00' | Horário que "acorda" |
| horario_fim | time | '23:00' | Horário que "dorme" |
| msgs_por_dia_min | integer | 3 | Mínimo de msgs por dia |
| msgs_por_dia_max | integer | 10 | Máximo de msgs por dia |
| chance_so_reagir | integer | 40 | % chance de só reagir com emoji (0-100) |
| emojis_reacao | jsonb | '["🔥","👏","💰","😂","💪"]' | Emojis usados nas reações |
| warmup_dias | integer | 7 | Dias de warmup ao conectar número novo |
| warmup_progressao | jsonb | '{"semana1":0.2,"semana2":0.5,"semana3":0.8,"semana4":1.0}' | Multiplicador de atividade por semana |
| ausencia_habilitada | boolean | true | Se pode ficar "offline" |
| ausencia_frequencia_dias | integer | 15 | A cada N dias pode sumir |
| ausencia_duracao_min | integer | 1 | Mínimo de dias offline |
| ausencia_duracao_max | integer | 3 | Máximo de dias offline |
| blacklist_palavras | jsonb | '[]' | Palavras que NUNCA usa |
| blacklist_atitudes | jsonb | '[]' | Comportamentos proibidos (ex: "nunca xinga", "nunca discorda do expert") |
| system_prompt_extra | text | | nullable — instruções adicionais pro LLM |
| template_origem_id | uuid | | nullable — FK -> bot_persona_templates.id se veio de template |
| ativo | boolean | true | |
| created_at | timestamptz | now() | |
| updated_at | timestamptz | now() | |
| expert_id | uuid | | FK -> experts.id, NOT NULL |

#### `bot_persona_templates`
Templates pré-configurados de persona por nicho (white-label).

| Coluna | Tipo | Default | Notas |
|--------|------|---------|-------|
| id | uuid | gen_random_uuid() | PK |
| nome | text | | NOT NULL — "Apostador casual masculino 25-35" |
| nicho | text | 'apostas_esportivas' | |
| descricao | text | | nullable |
| config | jsonb | | Todos os campos da persona como JSON |
| ativo | boolean | true | |
| created_at | timestamptz | now() | |

RLS: Desativada (tabela global de templates)

#### `bot_grupo_config`
Configuração de quais bots atuam em qual grupo e como.

| Coluna | Tipo | Default | Notas |
|--------|------|---------|-------|
| id | uuid | gen_random_uuid() | PK |
| grupo_id | text | | NOT NULL — JID do grupo (@g.us) |
| grupo_nome | text | | NOT NULL |
| ativo | boolean | true | |
| silencio_minutos | integer | 30 | Tempo de silêncio pra bot quebrar |
| silencio_frases | jsonb | '[]' | Array de frases exemplo pra quebrar silêncio |
| delay_entre_bots_min | integer | 60 | Segundos mín entre msgs de bots diferentes |
| delay_entre_bots_max | integer | 300 | Segundos máx entre msgs de bots diferentes |
| triggers_ativos | jsonb | '{"hype":true,"social_proof":true,"engajamento":true,"defesa":true,"pergunta_plantada":true}' | |
| contexto_grupo | text | | nullable — descrição do que é o grupo |
| ultima_msg_bot_em | timestamptz | | nullable — controle pra delay entre bots |
| created_at | timestamptz | now() | |
| updated_at | timestamptz | now() | |
| expert_id | uuid | | FK -> experts.id, NOT NULL |

#### `bot_grupo_personas`
Relacionamento N:N — quais personas atuam em quais grupos, com qual instância.

| Coluna | Tipo | Default | Notas |
|--------|------|---------|-------|
| id | uuid | gen_random_uuid() | PK |
| bot_grupo_config_id | uuid | | FK -> bot_grupo_config.id, NOT NULL |
| bot_persona_id | uuid | | FK -> bot_personas.id, NOT NULL |
| instancia_id | integer | | FK -> whatsapp_rotacao.id, NOT NULL — instância que o bot usa |
| status | text | 'pendente' | CHECK: pendente, warmup, ativo, ausente, pausado |
| warmup_inicio | timestamptz | | nullable — quando começou warmup |
| ausencia_inicio | timestamptz | | nullable |
| ausencia_fim | timestamptz | | nullable |
| msgs_enviadas_hoje | integer | 0 | Reset diário |
| ultima_msg_em | timestamptz | | nullable |
| ativo | boolean | true | |
| created_at | timestamptz | now() | |
| expert_id | uuid | | FK -> experts.id, NOT NULL |

UNIQUE: (bot_grupo_config_id, bot_persona_id)

#### `bot_conhecimento`
Base de conhecimento (RAG) para os bots.

| Coluna | Tipo | Default | Notas |
|--------|------|---------|-------|
| id | bigint | serial | PK |
| categoria | text | | NOT NULL — 'comportamento', 'frases_hype', 'frases_social_proof', 'frases_engajamento', 'frases_defesa', 'frases_silencio', 'contexto_expert' |
| content | text | | NOT NULL |
| metadata | jsonb | | nullable |
| embedding | vector | | nullable (OpenAI embeddings) |
| expert_id | uuid | | FK -> experts.id, NOT NULL |

#### `bot_mensagens_log`
Log de tudo que os bots fizeram.

| Coluna | Tipo | Default | Notas |
|--------|------|---------|-------|
| id | uuid | gen_random_uuid() | PK |
| bot_persona_id | uuid | | FK -> bot_personas.id |
| grupo_id | text | | NOT NULL |
| tipo_acao | text | | NOT NULL — 'mensagem', 'reacao', 'presenca', 'leitura' |
| tipo_trigger | text | | nullable — 'hype', 'social_proof', 'engajamento', 'defesa', 'pergunta_plantada', 'silencio', 'espontaneo' |
| conteudo | text | | nullable — texto enviado ou emoji reagido |
| msg_referencia_id | text | | nullable — ID da msg que gerou a reação |
| created_at | timestamptz | now() | |
| expert_id | uuid | | FK -> experts.id, NOT NULL |

#### `bot_grupo_mensagens_cache`
Cache das últimas 50 mensagens por grupo (alternativa ao Redis se preferir Supabase).

| Coluna | Tipo | Default | Notas |
|--------|------|---------|-------|
| id | uuid | gen_random_uuid() | PK |
| grupo_id | text | | NOT NULL |
| autor_telefone | text | | NOT NULL |
| autor_nome | text | | nullable |
| conteudo | text | | NOT NULL |
| tipo | text | 'texto' | texto, audio, imagem |
| message_id | text | | nullable — ID WhatsApp |
| is_bot | boolean | false | Se foi enviada por um dos bots |
| created_at | timestamptz | now() | |
| expert_id | uuid | | FK -> experts.id, NOT NULL |

**Nota sobre Redis vs Supabase para cache:** Usar a tabela `bot_grupo_mensagens_cache` no Supabase é mais simples e não requer credencial adicional. O Redis seria mais performante mas adiciona complexidade. Recomendo começar com Supabase e migrar pra Redis só se performance virar problema. Uma RPC `get_ultimas_mensagens_grupo(p_grupo_id, p_limit)` resolve.

### RPCs Novas

```sql
-- Buscar últimas N mensagens de um grupo (para contexto do bot)
CREATE OR REPLACE FUNCTION get_ultimas_mensagens_grupo(p_grupo_id text, p_limit integer DEFAULT 50)
RETURNS TABLE(autor_nome text, conteudo text, tipo text, is_bot boolean, created_at timestamptz)
AS $$ ... ORDER BY created_at DESC LIMIT p_limit $$ ;

-- Buscar bots que devem agir agora (status ativo, dentro do horário, não excedeu msgs/dia)
CREATE OR REPLACE FUNCTION buscar_bots_ativos_agora()
RETURNS TABLE(
  persona_id uuid, persona_nome text, grupo_id text, grupo_nome text,
  instancia text, token text, expert_id uuid,
  tom_voz text, girias jsonb, emojis_favoritos jsonb, exemplos_frases jsonb,
  chance_so_reagir integer, emojis_reacao jsonb,
  msgs_enviadas_hoje integer, msgs_por_dia_max integer,
  sistema_prompt_extra text, blacklist_palavras jsonb, blacklist_atitudes jsonb,
  triggers_ativos jsonb, silencio_minutos integer, silencio_frases jsonb,
  contexto_grupo text, delay_entre_bots_min integer, delay_entre_bots_max integer,
  ultima_msg_bot_em timestamptz, bot_grupo_personas_id uuid
) AS $$ ... WHERE status='ativo' AND horario dentro da janela AND msgs_enviadas_hoje < msgs_por_dia_max $$ ;

-- Resetar contadores diários
CREATE OR REPLACE FUNCTION reset_bots_diario()
RETURNS void AS $$
  UPDATE bot_grupo_personas SET msgs_enviadas_hoje = 0;
  -- Verificar ausências: se ausencia_fim < now(), voltar status pra 'ativo'
  UPDATE bot_grupo_personas SET status = 'ativo', ausencia_inicio = NULL, ausencia_fim = NULL
  WHERE status = 'ausente' AND ausencia_fim <= now();
  -- Verificar warmup: se warmup_inicio + warmup_dias < now(), mudar pra 'ativo'
  -- (warmup_dias vem da persona)
$$ ;

-- Métricas dos bots
CREATE OR REPLACE FUNCTION bot_metricas(p_expert_id uuid, p_dias integer DEFAULT 7)
RETURNS TABLE(
  persona_nome text, grupo_nome text,
  total_mensagens bigint, total_reacoes bigint,
  msgs_por_dia numeric
) AS $$ ... $$ ;

-- Inserir mensagem no cache e manter apenas últimas 50
CREATE OR REPLACE FUNCTION bot_cache_inserir_mensagem(
  p_grupo_id text, p_autor_telefone text, p_autor_nome text,
  p_conteudo text, p_tipo text, p_message_id text,
  p_is_bot boolean, p_expert_id uuid
) RETURNS void AS $$
BEGIN
  INSERT INTO bot_grupo_mensagens_cache (...) VALUES (...);
  -- Deletar msgs antigas mantendo apenas 50 por grupo
  DELETE FROM bot_grupo_mensagens_cache
  WHERE grupo_id = p_grupo_id AND expert_id = p_expert_id
  AND id NOT IN (
    SELECT id FROM bot_grupo_mensagens_cache
    WHERE grupo_id = p_grupo_id AND expert_id = p_expert_id
    ORDER BY created_at DESC LIMIT 50
  );
END;
$$ ;
```

### RLS Policies

Mesmo padrão de TODAS as outras tabelas do projeto:
```sql
-- Para cada tabela nova (bot_personas, bot_grupo_config, bot_grupo_personas,
-- bot_conhecimento, bot_mensagens_log, bot_grupo_mensagens_cache):
-- 4 policies (SELECT, INSERT, UPDATE, DELETE) com pattern:
current_setting('app.expert_id', true) IS NULL
OR current_setting('app.expert_id', true) = ''
OR expert_id::text = current_setting('app.expert_id', true)
```

`bot_persona_templates` — RLS desativada (global).

### Prompt para Claude Code — Fase 1

```
Use o Supabase MCP para executar as migrations.

Crie as seguintes tabelas no banco Supabase (projeto albdkqpvoyfhziozgwlk):

1. bot_persona_templates — Templates globais de persona (SEM RLS)
2. bot_personas — Personas configuráveis por expert
3. bot_grupo_config — Configuração de bots por grupo
4. bot_grupo_personas — Relação persona ↔ grupo ↔ instância
5. bot_conhecimento — Base de conhecimento RAG (com coluna embedding vector)
6. bot_mensagens_log — Log de ações dos bots
7. bot_grupo_mensagens_cache — Cache de últimas 50 msgs por grupo

Esquema exato de cada tabela:

[COLAR ESQUEMA COMPLETO DAS TABELAS ACIMA]

Para TODAS as tabelas exceto bot_persona_templates, criar:
- RLS habilitada
- 4 policies (SELECT, INSERT, UPDATE, DELETE) com o padrão:
  current_setting('app.expert_id', true) IS NULL
  OR current_setting('app.expert_id', true) = ''
  OR expert_id::text = current_setting('app.expert_id', true)

Criar trigger handle_updated_at para bot_personas e bot_grupo_config.

Criar as RPCs:
- get_ultimas_mensagens_grupo(p_grupo_id text, p_limit integer DEFAULT 50)
- buscar_bots_ativos_agora() — retorna bots com status='ativo', dentro do horário (comparar horario_inicio/horario_fim da persona com NOW() AT TIME ZONE 'America/Sao_Paulo'), msgs_enviadas_hoje < msgs_por_dia_max, com JOIN em bot_grupo_config (ativo=true) e whatsapp_rotacao (pra pegar instancia e token)
- reset_bots_diario() — reseta msgs_enviadas_hoje, resolve ausências vencidas, resolve warmups vencidos
- bot_metricas(p_expert_id uuid, p_dias integer DEFAULT 7)
- bot_cache_inserir_mensagem(...)

Após criar tudo, verificar:
1. SELECT * FROM bot_persona_templates; (deve retornar vazio sem erro)
2. SELECT * FROM bot_personas; (deve retornar vazio sem erro)
3. SELECT * FROM buscar_bots_ativos_agora(); (deve retornar vazio sem erro)
4. SELECT * FROM bot_metricas('d2de0b51-326f-446a-96e8-0179ebc819dd', 7); (deve retornar vazio sem erro)

Inserir 3 templates iniciais em bot_persona_templates:
1. "Apostador Casual Masculino" — tom casual, 25-35 anos, usa gírias de aposta, emojis 🔥💰, horário 10:00-23:00, 5-12 msgs/dia
2. "Iniciante Curiosa Feminina" — tom animado, 22-28 anos, faz muitas perguntas, emojis 😍🤑, horário 09:00-22:00, 3-8 msgs/dia
3. "Veterano Confiante" — tom neutro, 30-40 anos, dá dicas, emojis 👊✅, horário 11:00-00:00, 4-10 msgs/dia

NÃO mexa em nenhuma tabela, RPC, policy ou trigger existente.
```

### Teste da Fase 1

Após executar, verificar via Supabase MCP:
- Todas as 7 tabelas existem
- RLS está ativa em 6 delas
- As 3 templates foram inseridas
- RPCs retornam sem erro

---

## FASE 2 — Frontend: Aba "Bots" na Página de Grupos

### Objetivo
Criar a aba "Bots" dentro da página de Grupos, com a estrutura de sub-abas e navegação. Nesta fase, apenas a estrutura visual — sem lógica de dados.

### Prompt para Claude Code — Fase 2

```
Ative a skill frontend-design antes de começar as modificações.

Na página de Grupos (src/pages/Grupos.tsx ou equivalente), adicionar uma nova aba "Bots" ao lado das abas existentes (Membros, Moderação, Configuração). Usar ícone Bot (lucide-react).

Dentro da aba "Bots", criar 4 sub-abas (estilo toggle/pill, mesmo padrão das sub-abas de Moderação):
1. "Personas" — Biblioteca de personas
2. "Grupos Ativos" — Config de bots por grupo
3. "Conhecimento" — Base de conhecimento RAG
4. "Métricas" — Analytics dos bots

Por enquanto cada sub-aba mostra apenas um placeholder:
- Ícone + texto "Em breve" centralizado
- Estilo consistente com o resto do painel

Regras de design:
- Respeitar 100% o design system existente: fundo #0a0a0a, cards #1a1a1a, border #232328, glassmorphism
- Não inventar nenhum estilo novo — usar os mesmos padrões das outras abas
- A aba "Bots" deve ter ícone Bot (lucide-react) na cor --color-primary quando ativa
- Toggle/pill das sub-abas: mesmo visual das sub-abas de Moderação
- Responsivo: em mobile as sub-abas devem ser scrolláveis horizontalmente

NÃO mexa no conteúdo das abas Membros, Moderação e Configuração.
NÃO mexa em nenhum hook, store ou lógica de dados existente.
Apenas adicione a nova aba e sua estrutura visual.

Após implementar, acessar http://localhost:5173/#/grupos e verificar:
1. Aba "Bots" aparece ao lado das outras
2. Clicar nela mostra as 4 sub-abas
3. Cada sub-aba mostra o placeholder
4. Nenhuma aba existente quebrou
```

### Teste da Fase 2

Usar computer use para acessar `http://localhost:5173/#/grupos`:
- Verificar que aba "Bots" aparece
- Clicar em cada sub-aba funciona
- Abas existentes continuam funcionando

---

## FASE 3 — Frontend: Sub-aba "Personas"

### Objetivo
CRUD completo de personas com todos os campos configuráveis.

### Prompt para Claude Code — Fase 3

```
Ative a skill frontend-design antes de começar as modificações.

Criar o hook src/hooks/useBotPersonas.ts e implementar a sub-aba "Personas" dentro da aba Bots da página Grupos.

## Hook useBotPersonas

Operações:
- listar personas do expert (com paginação)
- criar persona (manual ou a partir de template)
- editar persona
- deletar persona
- listar templates disponíveis (de bot_persona_templates)
- criar persona a partir de template (copia config do template, permite editar antes de salvar)

Todas as queries filtradas pelo expert_id do authStore (getActiveExpertId()).
Usar o padrão dos outros hooks do projeto (supabase client de lib/supabase.ts).

## Sub-aba "Personas" — Layout

### Estado vazio
Card centralizado com ícone Bot, texto "Nenhuma persona criada" e botão "Criar Persona".

### Lista de personas
Grid de cards (2 colunas em desktop, 1 em mobile). Cada card mostra:
- Avatar circular com foto (ou iniciais com cor gerada pelo nome)
- Nome da persona + badge de status (ativo/inativo)
- Info resumida: idade, cidade, tom de voz
- Horário: ícone relógio + "08:00 - 23:00"
- Atividade: ícone msg + "3-10 msgs/dia"
- Chance de só reagir: "40% só reage"
- Warmup: badge se está em warmup (ex: "Warmup: dia 3/7")
- Botões: Editar | Configurar Perfil WPP | Duplicar | Excluir

### Botão "Criar Persona"
Abre modal com 2 opções:
1. "Criar do zero" — abre formulário completo
2. "Usar template" — mostra lista de templates, ao selecionar preenche o formulário com os valores do template

### Modal/Drawer de Criar/Editar Persona
Formulário em seções colapsáveis (acordeão):

**Seção 1 — Identidade**
- Nome (input text, obrigatório)
- Idade (input number)
- Cidade (input text)
- Profissão (input text)
- Foto (input URL ou upload — se upload, usar Supabase Storage bucket expert-logos)

**Seção 2 — Personalidade**
- Tom de voz (select: muito_informal, casual, neutro, animado)
- Gírias (tag input — digita e adiciona com Enter)
- Emojis favoritos (emoji picker ou tag input)
- Exemplos de frases (textarea, uma frase por linha — salva como array)
- Prompt extra (textarea — instruções adicionais)

**Seção 3 — Comportamento**
- Horário início (time picker)
- Horário fim (time picker)
- Msgs por dia mín (input number)
- Msgs por dia máx (input number)
- Chance de só reagir (slider 0-100%)
- Emojis de reação (tag input)

**Seção 4 — Warmup**
- Dias de warmup (input number)
- Progressão (4 inputs: semana1 %, semana2 %, semana3 %, semana4 %)

**Seção 5 — Ausência**
- Habilitada (toggle)
- Frequência em dias (input number)
- Duração mínima dias (input number)
- Duração máxima dias (input number)

**Seção 6 — Restrições**
- Blacklist de palavras (tag input)
- Blacklist de atitudes (tag input — cada item é uma frase como "nunca xinga")

Botão Salvar no footer do modal.
Toast de sucesso/erro.

### Botão "Configurar Perfil WPP" (em cada card de persona)
Abre um modal pequeno:
- Campo: Nome no WhatsApp (input text, preenchido com nome da persona)
- Campo: Foto de Perfil (input URL ou preview da foto atual)
- Dropdown: Selecionar instância (lista de whatsapp_rotacao onde tipo='bot' ou todas disponíveis)
- Botão "Aplicar no WhatsApp"

Ao clicar "Aplicar":
1. Chama webhook n8n POST /bot-configurar-perfil com:
   { instancia, token, nome, foto_url }
2. Webhook no n8n executa:
   - POST /profile/name com { name: nome }
   - POST /profile/image com { image: foto_url }
3. Toast de sucesso

Regras:
- Respeitar 100% o design system existente
- Cards com glassmorphism sutil (bg #1a1a1a, border #232328)
- Inputs escuros (bg #0f0f0f, border #2a2a2a, focus border --color-primary)
- Modais com overlay escuro, bg #1a1a1a
- NÃO mexa em nenhuma outra aba ou componente existente
- NÃO mexa em nenhum outro hook

Após implementar, acessar http://localhost:5173/#/grupos, aba Bots, sub-aba Personas:
1. Verificar que o estado vazio aparece
2. Criar uma persona manualmente — todos os campos funcionam
3. Criar uma persona a partir de template — campos preenchidos automaticamente
4. Editar a persona — salva corretamente
5. Listar personas — cards aparecem corretamente
```

### Teste da Fase 3

Computer use em `http://localhost:5173/#/grupos`:
- Criar persona manual
- Criar persona de template
- Editar persona
- Verificar via Supabase MCP: `SELECT * FROM bot_personas WHERE expert_id = 'd2de0b51-326f-446a-96e8-0179ebc819dd'`

---

## FASE 4 — Frontend: Sub-aba "Grupos Ativos"

### Objetivo
Configurar quais bots atuam em quais grupos, com todas as opções de trigger, silêncio e delays.

### Prompt para Claude Code — Fase 4

```
Ative a skill frontend-design antes de começar as modificações.

Criar o hook src/hooks/useBotGrupos.ts e implementar a sub-aba "Grupos Ativos" dentro da aba Bots da página Grupos.

## Hook useBotGrupos

Operações:
- listar bot_grupo_config do expert (JOIN com bot_grupo_personas para contar bots por grupo)
- criar config de grupo (selecionar grupo, definir configurações)
- editar config de grupo
- deletar config de grupo
- listar bot_grupo_personas de um grupo (com dados da persona e instância)
- adicionar persona a um grupo (escolher persona + instância)
- remover persona de um grupo
- buscar grupos disponíveis: chamar webhook POST {N8N_BASE}/bot-buscar-grupos com { instancia, token } que retorna lista de grupos via UAZAPI GET /group/list (reutilizar mesmo padrão do agendamento)

## Sub-aba "Grupos Ativos" — Layout

### Estado vazio
Card centralizado, ícone Users, "Nenhum grupo configurado", botão "Adicionar Grupo".

### Lista de grupos
Cards em lista vertical. Cada card expandível (acordeão):

**Header do card (sempre visível):**
- Nome do grupo
- Badge: N bots ativos
- Badge: status (ativo/pausado)
- Toggle ativo/inativo
- Botão expandir (chevron)

**Conteúdo expandido — Seção "Bots no Grupo":**
Lista dos bots atribuídos a este grupo. Cada item:
- Avatar + nome da persona
- Badge de status: pendente (cinza), warmup dia X/Y (amarelo), ativo (verde), ausente (laranja), pausado (vermelho)
- Instância: nome + número
- Msgs hoje: X/Y (usado/máximo)
- Botões: Pausar | Remover

Botão "+ Adicionar Bot" abre modal:
- Dropdown: Selecionar persona (lista de bot_personas ativas que NÃO estão neste grupo)
- Dropdown: Selecionar instância (lista de whatsapp_rotacao disponíveis)
- Checkbox: "Adicionar este número ao grupo automaticamente"
  - Se marcado: dropdown extra "Instância admin que vai adicionar" (instância que já é admin do grupo)
- Botão Salvar

Ao salvar com "Adicionar ao grupo automaticamente":
1. Insere em bot_grupo_personas com status='pendente'
2. Chama webhook POST {N8N_BASE}/bot-adicionar-ao-grupo com:
   { grupo_id, numero_bot, instancia_admin, token_admin }
3. Webhook no n8n executa:
   POST /group/updateParticipants com { groupjid, action: "add", participants: [numero_bot] }
4. Se sucesso, atualiza status pra 'warmup' (se warmup_dias > 0) ou 'ativo'

**Conteúdo expandido — Seção "Configurações":**

Triggers (toggles individuais):
- Hype (reage quando expert posta resultado/green)
- Social Proof (mensagens tipo "entrei semana passada e já tô no lucro")
- Engajamento (perguntas pra animar o grupo: "quem vai na live?")
- Defesa (defende o expert quando questionam)
- Pergunta Plantada (faz pergunta que expert quer responder)

Detecção de Silêncio:
- Toggle habilitado/desabilitado
- Input: minutos de silêncio (default 30)
- Textarea: frases exemplo pra quebrar silêncio (uma por linha, salvas como jsonb array)

Delays:
- Input: delay mín entre bots (segundos, default 60)
- Input: delay máx entre bots (segundos, default 300)

Contexto do grupo:
- Textarea: descrição do contexto (ex: "Grupo VIP de roleta do Allan, membros pagam R$49/mês")

Botão Salvar Configurações.

### Botão "Adicionar Grupo"
Modal com:
- Buscar grupos via webhook (mesmo padrão do agendamento — precisa escolher uma instância primeiro pra listar os grupos)
- Selecionar grupo da lista
- Salvar — cria bot_grupo_config com defaults

Regras:
- Mesmo design system
- Cards expandíveis com transição suave (max-height ou framer-motion se já estiver no projeto)
- NÃO mexa em nada fora da aba Bots
- NÃO mexa em nenhum hook existente

Após implementar, testar:
1. Adicionar grupo — lista de grupos carrega
2. Adicionar bot ao grupo — persona + instância selecionadas
3. Configurações de triggers — toggles salvam
4. Silêncio e delays — valores salvam
5. Verificar no banco: bot_grupo_config e bot_grupo_personas populados
```

### Teste da Fase 4

Computer use + Supabase MCP para verificar dados salvos.

---

## FASE 5 — Frontend: Sub-aba "Conhecimento" (RAG)

### Objetivo
Gerenciar base de conhecimento dos bots — adicionar exemplos de frases por categoria e alimentar embeddings.

### Prompt para Claude Code — Fase 5

```
Ative a skill frontend-design antes de começar as modificações.

Criar o hook src/hooks/useBotConhecimento.ts e implementar a sub-aba "Conhecimento" dentro da aba Bots.

## Hook useBotConhecimento

Operações:
- listar conhecimentos por categoria (SELECT de bot_conhecimento agrupado por categoria)
- adicionar conhecimento (INSERT + chamar webhook pra gerar embedding)
- editar conhecimento
- deletar conhecimento

Para gerar embedding ao adicionar/editar:
Chamar webhook POST {N8N_BASE}/bot-adicionar-conhecimento com:
{ content, categoria, expert_id }
O workflow no n8n vai gerar embedding e inserir/atualizar no banco.

## Sub-aba "Conhecimento" — Layout

Dividida em 7 categorias (tabs ou acordeão):
1. Comportamento — regras gerais de como o bot se comporta
2. Frases Hype — exemplos de reações entusiasmadas
3. Frases Social Proof — exemplos de prova social
4. Frases Engajamento — perguntas e interações
5. Frases Defesa — como defender o expert
6. Frases Silêncio — frases pra quebrar silêncio
7. Contexto Expert — info sobre o expert, a casa de apostas, regras

Cada categoria:
- Lista de itens (content) em cards compactos
- Botão + Adicionar (abre input/textarea inline ou modal pequeno)
- Botão editar/excluir em cada item
- Contador: "12 exemplos"

Ao adicionar:
1. Salva no banco via hook
2. Chama webhook pra embedding (assíncrono, não bloqueia UI)
3. Toast "Conhecimento adicionado e embedding gerado"

Regras:
- Design system existente
- Cards compactos, texto truncado com expand on click
- NÃO mexa em nada fora da aba Bots

Após implementar, testar:
1. Adicionar frases em cada categoria
2. Verificar no banco: bot_conhecimento populado
3. (Embedding será testado na fase do workflow n8n)
```

---

## FASE 6 — N8N: Workflows dos Bots

### Objetivo
Criar os workflows que fazem os bots funcionarem. São 4 workflows NOVOS, não mexer em nenhum existente.

### Workflow 1: Bot Engine Principal
**Nome:** Bot Engine - Engajamento Grupos
**Triggers:**
- Schedule a cada 3 minutos (verificar se algum bot deve agir)
- Webhook POST `/bot-mensagem-grupo` (recebe msgs do grupo em tempo real pra cache + trigger reativo)

**Fluxo Schedule (proativo — silêncio e espontâneo):**
1. Chamar RPC `buscar_bots_ativos_agora()` — retorna todos os bots elegíveis
2. Agrupar por grupo_id
3. Para cada grupo:
   a. Buscar última msg do grupo em `bot_grupo_mensagens_cache`
   b. Se (now - ultima_msg) > silencio_minutos E trigger silêncio ativo:
      - Selecionar 1 bot aleatório do grupo
      - Buscar frases de silêncio via RAG (match_documents com categoria='frases_silencio')
      - Montar prompt com persona + contexto + frases de referência
      - **Nó AI Agent** com **OpenAI GPT-4.1 mini**: gerar mensagem humanizada
      - Verificar delay_entre_bots (agora - ultima_msg_bot_em > delay_min)
      - Enviar presença "composing" via UAZAPI POST /message/presence (delay 3-8s)
      - Decisão: chance_so_reagir → se vai só reagir (mas não tem msg recente pra reagir, pula)
      - Enviar texto via UAZAPI POST /send/text
      - Registrar em bot_mensagens_log
      - Atualizar bot_grupo_personas (msgs_enviadas_hoje++, ultima_msg_em)
      - Atualizar bot_grupo_config (ultima_msg_bot_em)

**Fluxo Webhook (reativo — hype, social_proof, defesa, engajamento):**
1. Recebe payload: { grupo_id, autor_telefone, autor_nome, conteudo, message_id, expert_id, instancia }
2. Inserir em bot_grupo_mensagens_cache via RPC bot_cache_inserir_mensagem
3. Identificar se o autor é o expert (comparar telefone com dados do expert)
4. Se é expert E trigger hype ativo:
   a. Selecionar 1-2 bots do grupo (aleatório, respeitando delay_entre_bots)
   b. Buscar exemplos via RAG (categoria='frases_hype')
   c. **Nó AI Agent** com contexto: últimas 50 msgs do grupo + persona + msg do expert
   d. System prompt do Agent:

```
Você é {{persona_nome}}, um membro real de um grupo de WhatsApp sobre roleta online.

IDENTIDADE:
- Idade: {{idade}}, Cidade: {{cidade}}, Profissão: {{profissao}}
- Tom de voz: {{tom_voz}}
- Gírias que você usa: {{girias}}
- Emojis favoritos: {{emojis_favoritos}}

CONTEXTO DO GRUPO:
{{contexto_grupo}}

ÚLTIMAS MENSAGENS DO GRUPO:
{{ultimas_mensagens}}

EXEMPLOS DE COMO VOCÊ FALA (referência, não copie):
{{exemplos_frases}}

EXEMPLOS DA BASE DE CONHECIMENTO:
{{rag_results}}

REGRAS ABSOLUTAS:
1. Você fala EXCLUSIVAMENTE sobre roleta e o contexto do grupo. Se alguém falar de outro assunto, IGNORE.
2. Você NUNCA revela que é um bot.
3. Você NUNCA usa estas palavras: {{blacklist_palavras}}
4. Você NUNCA faz estas coisas: {{blacklist_atitudes}}
5. Escreva de forma natural, curta (1-3 linhas MAX), com erros de digitação ocasionais.
6. Use seus emojis favoritos de forma natural, não exagere.
7. Responda ao contexto atual da conversa, não invente assuntos.
8. Tipo de interação agora: {{tipo_trigger}} (hype/social_proof/engajamento/defesa/silencio)

TAREFA: Escreva UMA mensagem curta e natural como {{persona_nome}} reagiria a esta conversa.
Retorne APENAS o texto da mensagem, nada mais.
```

   e. Delay humanizado: Math.random() * (delay_max - delay_min) + delay_min (em segundos)
   f. Enviar presença "composing" com delay proporcional ao tamanho da msg
   g. Decisão: chance_so_reagir → reagir com emoji OU enviar texto
      - Se reagir: POST /message/react com emoji aleatório dos emojis_reacao
      - Se texto: POST /send/text
   h. Log + atualizar contadores

5. Se NÃO é expert E trigger defesa/engajamento ativo:
   - Analisar se a msg questiona o expert ou o grupo (via Agent)
   - Se sim → trigger defesa
   - Se é pergunta genérica sobre roleta → trigger engajamento (chance menor, ex: 20%)

**Nó AI Agent — Configuração:**
- Modelo: OpenAI GPT-4.1 mini (credencial OpenAI existente no n8n)
- Temperature: 0.9 (mais criativo/humano)
- Max tokens: 150 (msgs curtas)
- Tool: Supabase Vector Store Search (para RAG de bot_conhecimento)

**Controle de warmup:**
- Se bot está em status 'warmup':
  - Calcular semana atual: (now - warmup_inicio) / 7
  - Multiplicar msgs_por_dia_max pelo fator da semana (warmup_progressao)
  - Semana 1: apenas reações (chance_so_reagir = 90%)
  - Semana 2+: começa a enviar texto

**Controle de ausência:**
- No schedule, verificar se algum bot deve entrar em ausência:
  - Se ausencia_habilitada E random() < (1 / ausencia_frequencia_dias):
    - Sortear duração entre min e max
    - Atualizar status='ausente', ausencia_inicio=now, ausencia_fim=now+duração

### Workflow 2: Bot Onboarding
**Nome:** Bot Onboarding - Perfil e Grupos
**Triggers:** Webhooks:
- POST `/bot-configurar-perfil` — Configura nome e foto no WhatsApp
- POST `/bot-adicionar-ao-grupo` — Adiciona número do bot a um grupo
- POST `/bot-buscar-grupos` — Lista grupos de uma instância

**Fluxo /bot-configurar-perfil:**
1. Recebe: { instancia, token, nome, foto_url }
2. POST /profile/name no UAZAPI com header token: { name: nome }
3. Se foto_url: POST /profile/image com { image: foto_url }
4. Respond to Webhook: { success: true }

**Fluxo /bot-adicionar-ao-grupo:**
1. Recebe: { grupo_id, numero_bot, instancia_admin, token_admin }
2. POST /group/updateParticipants no UAZAPI:
   Header: token_admin
   Body: { groupjid: grupo_id, action: "add", participants: [numero_bot] }
3. Respond to Webhook: resultado

**Fluxo /bot-buscar-grupos:**
1. Recebe: { instancia, token }
2. GET /group/list no UAZAPI com header token
3. Filtrar: apenas grupos onde OwnerIsAdmin = true (bot é admin) ou todos
4. Respond to Webhook: lista filtrada

### Workflow 3: Bot Conhecimento (Embeddings)
**Nome:** Bot Conhecimento - RAG Embeddings
**Trigger:** Webhook POST `/bot-adicionar-conhecimento`

**Fluxo:**
1. Recebe: { content, categoria, expert_id, id? (se edição) }
2. Gerar embedding via OpenAI API: POST https://api.openai.com/v1/embeddings
   Model: text-embedding-3-small (MESMO modelo usado no sistema de copy)
   Input: content
3. Se id fornecido (edição):
   UPDATE bot_conhecimento SET content=content, metadata={"categoria": categoria}, embedding=embedding WHERE id=id
4. Se não (novo):
   INSERT INTO bot_conhecimento (content, metadata, embedding, expert_id) VALUES (...)
5. Respond to Webhook: { success: true, id }

**IMPORTANTE:** Usar o mesmo padrão de embedding do workflow "Gerar Copy IA" (sZL4y53vrSN77RCr):
- Pipeline manual: HTTP Request → Code node → $http.request() POST ao Supabase REST API
- NÃO usar o nó nativo Supabase Vector Store (sobrescreve metadata)
- Metadata: { "categoria": categoria, "expert_id": expert_id }

### Workflow 4: Bot Cache de Mensagens
**Nome:** Bot Cache - Mensagens Grupo
**Trigger:** Webhook POST `/bot-cache-mensagem`

**Fluxo:**
1. Recebe: { grupo_id, autor_telefone, autor_nome, conteudo, tipo, message_id, is_bot, expert_id }
2. Chama RPC bot_cache_inserir_mensagem com os parâmetros
3. Se a mensagem NÃO é de um bot (is_bot=false):
   - Chamar internamente o Workflow 1 via Execute Workflow (trigger reativo)
   - OU: fazer HTTP Request pro webhook /bot-mensagem-grupo
4. Respond to Webhook: { success: true }

**Como as mensagens do grupo chegam neste webhook:**
- O webhook de grupos já existente (seguranca/moderação) recebe msgs dos grupos
- NÃO vamos modificar esses workflows
- Em vez disso, configurar um SEGUNDO webhook na instância dos bots (ou usar webhook global UAZAPI)
- Cada instância de bot já recebe as msgs do grupo onde está — configurar o webhook da instância pra apontar pra /bot-cache-mensagem

### Prompt para Claude Code — Fase 6

```
Use o n8n MCP para criar os workflows. NÃO modifique nenhum workflow existente.

Criar 4 workflows novos:

### Workflow 1: "Bot Engine - Engajamento Grupos"
[COLAR FLUXO DETALHADO DO WORKFLOW 1 ACIMA]

Nó AI Agent:
- Tipo: AI Agent
- Modelo: OpenAI Chat Model — gpt-4.1-mini
- Usar credencial OpenAI existente no n8n
- System prompt: [COLAR SYSTEM PROMPT COMPLETO]
- Temperature: 0.9
- Max tokens: 150
- Conectar tool: Supabase Vector Store Retriever para buscar bot_conhecimento (com filtro metadata->categoria e metadata->expert_id)

Para o RAG no AI Agent, usar o padrão manual:
- HTTP Request node pra OpenAI Embeddings (text-embedding-3-small) pra converter a query em vetor
- Supabase node pra chamar RPC match_documents (ou query direta na tabela bot_conhecimento com operador <=>)
- Code node pra formatar resultados como contexto pro Agent

Schedule: a cada 3 minutos
Webhook: POST /bot-mensagem-grupo

### Workflow 2: "Bot Onboarding - Perfil e Grupos"
[COLAR FLUXO DO WORKFLOW 2]

3 webhooks: /bot-configurar-perfil, /bot-adicionar-ao-grupo, /bot-buscar-grupos
Usar UAZAPI endpoints conforme documentado no SKILL.md do projeto.

### Workflow 3: "Bot Conhecimento - RAG Embeddings"
[COLAR FLUXO DO WORKFLOW 3]

Webhook: /bot-adicionar-conhecimento
Mesmo padrão de embedding do workflow "Gerar Copy IA" existente:
- HTTP Request pro OpenAI (text-embedding-3-small)
- Code node pra montar payload
- HTTP Request pro Supabase REST API (NÃO usar nó nativo Vector Store)

### Workflow 4: "Bot Cache - Mensagens Grupo"
[COLAR FLUXO DO WORKFLOW 4]

Webhook: /bot-cache-mensagem

Após criar, verificar:
1. Todos os 4 workflows estão criados e ativos
2. Endpoints de webhook respondem (testar com curl)
3. Workflow 2 /bot-buscar-grupos retorna lista quando chamado
4. Workflow 3 gera embedding e insere no banco
5. NÃO foi modificado nenhum workflow existente
```

### Teste da Fase 6

- Testar cada webhook manualmente via HTTP Request ou curl
- Verificar que os 19 workflows originais continuam intactos
- Inserir conhecimento via webhook e verificar embedding no banco

---

## FASE 7 — Integração: Conectar Frontend aos Workflows

### Objetivo
Conectar os botões do frontend aos webhooks n8n criados na Fase 6.

### Prompt para Claude Code — Fase 7

```
Ative a skill frontend-design antes de começar as modificações.

Atualizar o arquivo de webhooks (src/config/webhooks.ts ou equivalente) adicionando os novos endpoints:

const BOT_WEBHOOKS = {
  configurarPerfil: `${N8N_BASE}/bot-configurar-perfil`,
  adicionarAoGrupo: `${N8N_BASE}/bot-adicionar-ao-grupo`,
  buscarGrupos: `${N8N_BASE}/bot-buscar-grupos`,
  adicionarConhecimento: `${N8N_BASE}/bot-adicionar-conhecimento`,
  cacheMensagem: `${N8N_BASE}/bot-cache-mensagem`,
}

Onde N8N_BASE = URL base dos webhooks n8n (mesma variável/padrão já usada no projeto).

Atualizar os hooks:
1. useBotPersonas — botão "Configurar Perfil WPP" chama /bot-configurar-perfil
2. useBotGrupos — "Adicionar ao grupo" chama /bot-adicionar-ao-grupo, "Buscar grupos" chama /bot-buscar-grupos
3. useBotConhecimento — ao adicionar/editar chama /bot-adicionar-conhecimento

Testar cada integração:
1. Configurar perfil de um bot — verificar que nome/foto mudou no WhatsApp
2. Adicionar bot a grupo — verificar que número foi adicionado
3. Adicionar conhecimento — verificar embedding no banco
```

---

## FASE 8 — Frontend: Sub-aba "Métricas"

### Prompt para Claude Code — Fase 8

```
Ative a skill frontend-design antes de começar as modificações.

Criar o hook src/hooks/useBotMetricas.ts e implementar a sub-aba "Métricas" dentro da aba Bots.

## Hook useBotMetricas

- Chamar RPC bot_metricas(expert_id, dias)
- Buscar alertas de suspeita: SELECT de bot_mensagens_log JOIN com bot_grupo_mensagens_cache onde alguma msg recente do grupo contém "bot" ou "fake" (busca simples com ILIKE)

## Layout

### Cards de resumo (topo):
- Total de mensagens (últimos 7 dias)
- Total de reações (últimos 7 dias)
- Bots ativos agora
- Grupos com bots

### Tabela detalhada:
Colunas: Persona | Grupo | Msgs (7d) | Reações (7d) | Média/dia | Status
Ordenável por qualquer coluna.
Filtro por persona ou grupo.

### Alertas de suspeita:
Card com borda amarela listando msgs do grupo que mencionam "bot", "fake", "robô", "automatizado".
Se nenhum alerta: "Nenhuma suspeita detectada ✓" em verde.

### Seletor de período:
7 dias | 15 dias | 30 dias

Regras de design: mesmo padrão do dashboard principal (MetricCard, etc).
NÃO mexa em nada fora da aba Bots.

Testar:
1. Métricas aparecem (mesmo que zeradas)
2. Filtro de período funciona
3. Alertas de suspeita funciona
```

---

## FASE 9 — Configuração de Webhook das Instâncias Bot

### Objetivo
Quando uma instância é usada como bot, seu webhook deve apontar pro /bot-cache-mensagem para alimentar o cache de contexto e trigger reativo.

### Prompt para Claude Code — Fase 9

```
No hook useBotGrupos, ao adicionar uma persona a um grupo (bot_grupo_personas INSERT):

1. Após inserir no banco, verificar se a instância já tem webhook configurado pro bot cache
2. Se não: chamar UAZAPI POST /webhook na instância do bot com:
   {
     url: "{N8N_BASE}/bot-cache-mensagem",
     events: ["messages"],
     excludeMessages: ["fromMeYes", "isGroupNo"],
     addUrlEvents: false
   }
   Isso faz a instância enviar apenas msgs recebidas em grupos pro cache.

Isso pode ser feito via webhook n8n existente (Workflow 2 /bot-configurar-perfil) adicionando uma opção "configurar_webhook: true" no payload. OU pode ser um endpoint separado.

Escolher a abordagem mais limpa e implementar.

ATENÇÃO: NÃO modificar webhooks de instâncias que já existem no sistema (as de disparo/segurança). Apenas configurar webhook para instâncias de bot (verificar pelo tipo ou pelo contexto).

Testar:
1. Ao adicionar bot a grupo, webhook da instância é configurado
2. Mensagens do grupo começam a aparecer em bot_grupo_mensagens_cache
3. Instâncias existentes (não-bot) não foram afetadas
```

---

## FASE 10 — Teste End-to-End

### Prompt para Claude Code — Fase 10

```
Teste completo do sistema de bots:

1. Acessar http://localhost:5173/#/grupos aba Bots

2. Criar uma persona "Teste Bot" com:
   - Nome: Carlos Silva
   - Idade: 28
   - Tom: casual
   - Horário: 00:00 - 23:59 (pra funcionar no teste)
   - Msgs/dia: 5-15
   - Chance reagir: 30%

3. Configurar Perfil WPP:
   - Selecionar uma instância de teste
   - Aplicar nome "Carlos Silva"
   - Verificar no UAZAPI que nome mudou

4. Adicionar um grupo de teste:
   - Buscar grupos
   - Selecionar um grupo
   - Adicionar a persona "Carlos Silva" com a instância

5. Adicionar conhecimento:
   - 3 frases de hype: "kkkk mais um green", "essa roleta tá pagando demais", "quem tá na live tá lucrando"
   - 3 frases de silêncio: "alguém vai jogar hoje?", "qual horário da live?", "tá quieto aqui hein"

6. Enviar uma mensagem manualmente no grupo de teste

7. Verificar:
   - Mensagem apareceu em bot_grupo_mensagens_cache
   - Workflow Bot Engine detectou a msg
   - Bot respondeu (ou reagiu) no grupo
   - Log apareceu em bot_mensagens_log
   - Métricas atualizaram

8. Esperar silêncio de 5 min (ajustar silencio_minutos=5 no teste)
   - Bot quebrou o silêncio com msg contextual

Se algum passo falhar, debugar e corrigir antes de seguir.
```

---

## Resumo das Fases

| Fase | O que faz | Dependência |
|------|-----------|-------------|
| 1 | Banco de dados (tabelas, RPCs, RLS) | Nenhuma |
| 2 | Frontend: aba Bots + estrutura visual | Fase 1 |
| 3 | Frontend: sub-aba Personas (CRUD) | Fase 2 |
| 4 | Frontend: sub-aba Grupos Ativos | Fase 3 |
| 5 | Frontend: sub-aba Conhecimento (RAG) | Fase 2 |
| 6 | N8N: 4 workflows novos | Fase 1 |
| 7 | Integração frontend ↔ n8n | Fases 3-6 |
| 8 | Frontend: sub-aba Métricas | Fases 6-7 |
| 9 | Config webhook das instâncias bot | Fase 6 |
| 10 | Teste end-to-end | Todas |

---

## Endpoints UAZAPI Utilizados (todos documentados no SKILL.md)

| Endpoint | Uso |
|----------|-----|
| POST /profile/name | Configurar nome do bot |
| POST /profile/image | Configurar foto do bot |
| POST /group/updateParticipants | Adicionar bot ao grupo |
| GET /group/list | Listar grupos |
| POST /send/text | Bot envia mensagem |
| POST /message/react | Bot reage com emoji |
| POST /message/presence | Bot mostra "digitando..." |
| POST /webhook | Configurar webhook da instância do bot |

## Credenciais necessárias no n8n

- **OpenAI** — já existe (usada nos outros workflows)
- **Supabase** — já existe (REST API)
- Redis — **NÃO será necessário** (usando Supabase para cache)

---

*PRD gerado em 2026-04-07. Escopo: MVP sem conversa entre bots (fase 2 futura).*
