## 1. Visao Geral

**Dashboard Leads** — Plataforma SaaS multi-tenant white-label para agencia de automacao gerenciar 5-15 experts independentes de apostas esportivas. Cada expert tem painel personalizado (cor, logo, persona, voz clonada) para captacao e conversao de leads via WhatsApp, com funil automatizado, torneios, moderacao de grupos e agendamento de mensagens em massa.

- **Stack:** React 19 + Vite + Tailwind + Supabase + n8n + UAZAPI (WhatsApp)
- **Frontend:** SPA com HashRouter, deploy GitHub Pages
- **Backend:** Supabase (PostgreSQL + RLS + Realtime + Storage) + n8n (automacoes)
- **Branch principal:** `main` (producao) | `multi-tenant` (desenvolvimento)

## 2. Arquitetura Multi-Tenant

**Isolamento por `expert_id`:** Toda tabela de dados tem coluna `expert_id UUID NOT NULL` com FK para `experts.id`. RLS ativa em todas as tabelas de dados (exceto `experts` e `planos` que sao tabelas de configuracao).

**Tabelas centrais:**
- `experts` — Perfil do expert (nome, slug, cores, logo, voice_id, voice_settings, plano_id)
- `planos` — Planos de assinatura (max_leads, max_instancias, max_envios_mes, features_permitidas)
- `admin_users` — Usuarios do sistema (role: 'admin' ou 'expert', vinculado via expert_id)

**RLS Pattern:** Todas as policies usam `current_setting('app.expert_id', true)` — se NULL ou vazio, permite acesso total (service_role); se definido, filtra por expert_id. CRUD completo (SELECT/INSERT/UPDATE/DELETE) em todas as tabelas.

**Auth customizada:** Login via RPC `admin_login(email, senha)` — retorna user com role e expert_id. Sessao em localStorage com TTL de 24h. Brute-force protection no frontend (delays progressivos).

**White-label:** CSS variables `--color-primary` e `--color-primary-hover` sobrescritas no login com cores do expert. Layout/estrutura identicos — apenas cor, logo, nome e persona mudam.

**Admin impersonation:** Admin pode "impersonar" qualquer expert via `startImpersonation()` no authStore (session-only, nao persiste).

## 3. Conexoes

**Supabase:**
- Projeto: `albdkqpvoyfhziozgwlk`
- URL: `https://albdkqpvoyfhziozgwlk.supabase.co`
- Anon key: via `VITE_SUPABASE_ANON_KEY` no `.env`
- Service role: usado apenas no n8n (NUNCA no frontend)

**n8n:**
- Primario: `https://n8n-gend.srv1431760.hstgr.cloud/webhook`
- Secundario: `https://n8n-n8n.04qisd.easypanel.host/webhook`
- Webhooks configurados em `src/config/webhooks.ts`

**UAZAPI (WhatsApp):**
- Base URL: `https://pedrooberlaender.uazapi.com`
- NUNCA usar Evolution API

**APIs externas (usadas no n8n):**
- MiniMax (voz clonada): `api.minimax.io` — modelo speech-2.8-hd
- OpenAI: GPT para classificacao de mensagens e geracao de copy
- Google Gemini: visao (OCR de screenshots) e analise de imagens
- Groq: Whisper para transcricao de audio
- Google Sheets API: relatorios de grupo
- Telegram Bot API: envio de mensagens agendadas

## 4. Convencoes de Codigo

- **Linguagem:** Portugues para UI/dominio, ingles para termos tecnicos
- **Funcoes/variaveis:** camelCase (`fetchLeads`, `iniciarEnvio`)
- **Constantes:** UPPER_SNAKE_CASE (`AUTO_REFRESH_MS`, `WEBHOOK_URL`)
- **Componentes:** PascalCase, named exports (`export const MetricCard`)
- **Hooks:** `use` prefix, retornam objetos (`{ leads, loading, error, refetch }`)
- **Tipos:** `Row` suffix para tabelas, `Props` para componentes, `type` para unions, `interface` para objetos
- **DB fields:** snake_case (matching Supabase schema)
- **Estilo:** Tailwind + `cn()` utility (clsx + tailwind-merge), dark theme only
- **Imports:** Relativos (`../`, `./`), `import type` para tipos
- **Erros:** try/catch em toda operacao async, `catch (err: unknown)`, mensagens em portugues
- **Comentarios:** Em portugues, apenas quando logica nao e auto-evidente
- **Commits:** Em portugues, descritivos e atomicos, NUNCA na branch main

## 5. Regras — NAO Alterar

- **Auth customizada** — NAO migrar para Supabase Auth
- **Conexao Supabase** — Mesmo projeto `albdkqpvoyfhziozgwlk`, NAO trocar
- **Stack** — React 19 + Vite + Tailwind + Supabase + n8n, NAO trocar
- **Design system** — Superficies fixas (#0a0a0a fundo, #1a1a1a cards, #232328 borders)
- **UAZAPI** — NUNCA usar Evolution API para WhatsApp
- **Layout** — Identico entre experts, apenas cores/logo/nome mudam
- **CSS transitions** — NUNCA `transition: all` em glass cards, NUNCA animar border-color com backdrop-filter
- **Popups** — Fundo opaco `rgba(22,27,34,0.97)`, SEM backdrop-filter

## 6. Seguranca

- **RLS ativa** em todas as tabelas de dados (22 tabelas com policies CRUD)
- **Service role** NUNCA no frontend — apenas no n8n
- **Anon key** no frontend via env var (acesso limitado por RLS)
- **Sanitizacao:** RPC `sanitize_text(input, max_length)` disponivel
- **Validacao:** RPCs `insert_lead_validated`, `update_lead_status_validated`, `validate_webhook_expert`
- **Brute-force:** Delays progressivos no login (1s @3, 5s @5, 30s @10 tentativas)
- **Sessao:** 24h TTL, localStorage, nao usa tokens Supabase Auth
- **Plan limits:** Enforced no frontend via `usePlanLimits` (hard blocks)
- **NUNCA** commitar .env, chaves de API ou credenciais

## 7. Banco de Dados — Tabelas (31 tabelas, 2 views)

**Tabelas principais:**
| Tabela | Funcao | RLS |
|--------|--------|-----|
| experts | Perfil do expert (cores, logo, voz, plano) | Nao |
| planos | Planos de assinatura com limites | Nao |
| admin_users | Usuarios do sistema (role + expert_id) | Sim |
| leads | Leads com funil de status e followups | Sim |
| mensagens | Historico de mensagens enviadas/recebidas | Sim |
| mensagens_funil_v2 | Templates do funil automatizado | Sim |
| followups_enviados | Registro de followups por cenario | Sim |
| templates_mensagem | Templates para envio em massa | Sim |
| configuracoes | Config key-value por expert | Sim |
| notificacoes | Alertas do sistema | Sim |
| whatsapp_rotacao | Numeros WhatsApp com status conexao | Sim |
| whatsapp_rotacao_config | Config de rotacao (indices) | Sim |
| whatsapp_rotacao_mensagens | Mensagens de rotacao | Sim |
| whatsapp_eventos_log | Log de eventos WhatsApp | Sim |
| torneios | Torneios de apostas | Sim |
| participantes | Participantes dos torneios | Sim |
| greens | Apostas ganhas (greens) | Sim |
| log_imagens | Log de processamento de imagens | Sim |
| torneio_copy | Textos customizaveis do torneio | Sim |
| torneio_premiacoes | Premiacoes por posicao | Sim |
| moderacao_grupos | Config de moderacao por grupo | Sim |
| moderacao_strikes | Strikes de membros | Sim |
| moderacao_log | Log de acoes de moderacao | Sim |
| agendamentos_mensagens | Mensagens para agendamento | Sim |
| agendamentos_grupos | Agendamentos com recorrencia | Sim |
| telegram_canais | Canais Telegram cadastrados | Sim |
| blacklist_grupos | Blacklist de telefones | Sim |
| expert_perfil | Perfil IA do expert (tom, palavras, emojis) | Sim |
| copys_geradas | Historico de copys geradas por IA | Sim |
| documents | Vector store para RAG (embeddings) | Sim |
| grupos_ignorar_coleta | Grupos ignorados na coleta | Sim |
| solicitacoes_senha | Solicitacoes de alteracao de senha | Nao |

**Views:** `ranking_torneio`, `whatsapp_status_painel`

**RPCs importantes:**
- `admin_login`, `admin_create_expert`, `admin_update_expert`, `admin_list_experts`, `admin_dashboard_metrics`
- `admin_create_plano`, `admin_update_plano`, `admin_list_planos`
- `get_metricas_dashboard`, `get_metricas_periodo`, `get_funil_status`
- `buscar_leads_envio_massa`, `buscar_leads_followup_expert`, `buscar_todos_leads_followup`
- `rotacionar_whatsapp(p_origem, p_expert_id)` — retorna proximo numero + mensagem
- `insert_lead_validated`, `update_lead_status_validated`, `validate_webhook_expert`
- `incrementar_strike`, `marcar_expulso`, `ranking_do_torneio`
- `set_expert_context(p_expert_id)` — define contexto RLS
- `match_documents` — busca vetorial para RAG

**Storage buckets:** `audios-assistente`, `expert-logos`, `midias-agendamentos`, `midias-leads`

## 8. Workflows N8N Ativos (19)

| ID | Nome | Trigger | Funcao |
|----|------|---------|--------|
| fGIHZHMvy3NdJzDQ | Boas vindas - Leads Insta | Webhook POST `/assistente-whatsapp` | Funil conversacional WhatsApp com 3 AI Agents, Redis debounce, voice cloning MiniMax |
| Ukax93riMgu0ZuKt | Follow up - assistente | Schedule 15min | Follow-ups multi-tenant automaticos com voz clonada por expert |
| 3oy03zzSKowztDZJ | Gerencia Instancias | Schedule 5min + Webhooks | Lifecycle completo de instancias UAZAPI (criar, conectar, reconectar, excluir) |
| nnGrV8nXuN58qaX8 | Rotatividade Numero - Trafego | Webhook GET `/whatsapp-rotacao` | Rotacao de numeros WhatsApp para links de trafego pago |
| 7WKSEmy5qfjb2MKu | Envio Mensagem - Saas | Webhooks POST `/envio-saas`, `/ranking-torneio`, `/cancelar-agendamento` | Disparo de mensagens individuais + cancelamento de agendamentos |
| C0izPuGtgN21l9Gt | Agendamento Grupos | Schedule 1min | Polling e envio de mensagens agendadas (WhatsApp + Telegram) |
| CRSUCkcd55Yx68sG | Torneio quantidade Green | Webhook POST `/torneio` | Processamento de greens via OCR (Gemini) + decriptografia E2E WhatsApp |
| sZL4y53vrSN77RCr | Gerar Copy IA | Webhooks POST `/gerar-copy`, `/adicionar-exemplo-copy` | Geracao de copy por IA com RAG (vector store) |
| fQ0w8wjvFLhPdELP | Seguranca Arnaldo2.0 | Webhooks POST `/seguranca`, `/buscar-grupos` | Moderacao de grupos WhatsApp com IA (classificacao de violacoes) |
| RUvgq5XkaBYTFzsr | Black List | Webhook POST `/blacklist-remover` | Remove telefone de TODOS os grupos WhatsApp |
| Xq87OgXxED42FZSa | Buscar Grupos Agendamento | Webhooks POST `/buscar-grupos-agendamento`, `/buscar-canais-telegram` | Lista grupos WhatsApp e canais Telegram para agendamento |
| NeYPRGRQnMePitXk | Relatorio Grupo | Webhook POST `/relatorio-grupo` | Gera relatorio Google Sheets de membros do grupo |
| JST7c30XbrE0nxPf | Fecha e Abre Grupo | Schedule 1min | Controle de horario de abertura/fechamento de grupos |
| Coep7glalyVC6pFu | Tratamento de erros | Error Trigger | Envia alerta WhatsApp quando qualquer workflow falha |
| PJ87h1KYIUdbnYAl | Reset diario | Schedule horario | Gera relatorio diario e reseta contadores de disparos |
| PjLjjljVcQbNkTjo | disparoMensagens | Execute Workflow (sub) | Sub-workflow de disparo com rotacao de instancia e template |
| lysiSML2rdmSsfTG | Coleta de eventos | Webhook POST `/pegar-dados` | Recebe eventos de entrada/saida de grupos, resolve expert_id |
| rTz0ROleZMW5aXyk | Atualiza Grupo | Execute Workflow (sub) | Sub-workflow que atualiza leads quando entram/saem de grupos |
| ySD8VmARp7i5Yqzk | identificaConexao | Webhook POST `/conexao-numero` | Detecta conexao/desconexao de numeros WhatsApp |

## 9. Frontend — Estrutura

**Rotas principais:** `/dashboard`, `/leads`, `/funil`, `/conversas`, `/envios` (+ simulador, historico, templates, agendamentos, agendados, gerar-copy), `/grupos`, `/torneios`, `/mensagens`, `/central-whatsapp`, `/notificacoes`, `/configuracoes`

**Rotas admin:** `/admin`, `/admin/experts`, `/admin/experts/new`, `/admin/experts/:id/edit`, `/admin/planos`

**22 hooks** para data fetching (cada hook gerencia loading/error/data + Supabase Realtime):
- `useLeads`, `useDashboard`, `useFunil`, `useEnvioMassa`, `useTemplates`
- `useNotificacoes`, `useMensagensFunil`, `useGerarCopy`, `usePlanLimits`
- `useAgendamentos`, `useHistoricoEnvios`, `useConfiguracoes`, `useWhatsappRotacao`
- `useModeracao`, `useFeatureGate`, `useSupabase`, `useToast`, `useVisibilityRefresh`
- `useAdminClient`, `useAdminDashboard`, `useAdminExperts`, `useAdminPlanos`

**Estado global:** Apenas auth (Zustand `authStore.ts` com localStorage). Dados via hooks locais.

## 10. Deploy

- **Producao:** Branch `main` → build → `github-pages/` → GitHub Pages
- **Desenvolvimento:** Branch `multi-tenant`
- **Build:** `npm run build` (Vite, code splitting por vendor)
- **Sem sourcemaps** em producao, console/debugger removidos via esbuild

## 11. MCPs Disponiveis

**Supabase MCP:** Consultar tabelas, executar SQL, listar migrations, ver policies, storage — SEMPRE usar em vez de documentacao estatica para verificar estado atual do banco.

**n8n MCP (claude.ai):** Buscar workflows, ver detalhes, executar — SEMPRE usar para verificar workflows ativos e seus fluxos.

**n8n MCP (n8n-mcp):** Criar/editar workflows, validar, gerenciar — para operacoes de escrita nos workflows.

## GSD Workflow Enforcement

Antes de usar Edit, Write ou outras ferramentas que alteram arquivos, inicie o trabalho por um comando GSD para manter artefatos de planejamento e contexto de execucao sincronizados.

- `/gsd:quick` para fixes pequenos, docs, tarefas ad-hoc
- `/gsd:debug` para investigacao e bug fixing
- `/gsd:execute-phase` para trabalho de fase planejado

Nao faca edits diretos no repo fora de um workflow GSD a menos que o usuario peca explicitamente.
