# Requirements: Dashboard Leads — Multi-Tenant White-Label

**Defined:** 2026-03-27
**Core Value:** Isolamento seguro de dados entre experts — um expert NUNCA pode ver, modificar ou interagir com dados de outro expert, enquanto a agência (admin master) tem visibilidade e controle total sobre todos.

## v1 Requirements

### Multi-Tenant Core

- [x] **MTNT-01**: Tabela `experts` criada com campos: nome, slug, cor_primaria, cor_secundaria, logo_url, nome_plataforma, nome_assistente, voice_id, voice_settings (JSONB), plano_id, ativo, created_at
- [x] **MTNT-02**: Tabela `planos` criada com campos: nome, max_leads, max_instancias, max_envios_mes, features_permitidas (JSONB), ativo, created_at
- [x] **MTNT-03**: Coluna `expert_id` (UUID, NOT NULL, FK → experts.id) adicionada em todas as tabelas relevantes: leads, mensagens, followups_enviados, notificacoes, templates_mensagem, configuracoes, mensagens_funil_v2, whatsapp_rotacao, whatsapp_rotacao_config, whatsapp_rotacao_mensagens, whatsapp_eventos_log, moderacao_grupos, moderacao_strikes, moderacao_log, agendamentos_mensagens, agendamentos_grupos, torneios, participantes, greens, log_imagens, copys_geradas, expert_perfil, blacklist_grupos, grupos_ignorar_coleta, telegram_canais, documents
- [x] **MTNT-04**: Todos os 1762 leads existentes e dados relacionados migrados com expert_id do Allan (Expert #1)
- [x] **MTNT-05**: Índices criados em expert_id para todas as tabelas relevantes (performance de queries filtradas)

### Auth & Security

- [x] **AUTH-01**: Admin master pode fazer login com role `admin` e acessar rota /admin
- [x] **AUTH-02**: Expert pode fazer login com role `expert` e ver apenas seu painel personalizado
- [x] **AUTH-03**: Login vincula expert_id à sessão (armazenado no localStorage com expiração 24h)
- [x] **AUTH-04**: Rate limiting no login com delay progressivo contra brute force (1s, 2s, 4s, 8s...)
- [x] **AUTH-05**: RLS policies no Supabase filtram por expert_id em TODAS as tabelas (SELECT, INSERT, UPDATE, DELETE)
- [x] **AUTH-06**: Um expert não consegue acessar, ver ou modificar dados de outro expert via API direta
- [x] **AUTH-07**: RPCs do Supabase validam expert_id server-side (não confiam no frontend)
- [x] **AUTH-08**: Nenhuma chave sensível exposta no frontend (service_role_key, tokens UAZAPI, API keys Minimax)
- [x] **AUTH-09**: Inputs sanitizados contra XSS em todos os formulários e campos de texto
- [x] **AUTH-10**: CSP headers configurados via meta tags no index.html
- [x] **AUTH-11**: Console.log removidos no build de produção via esbuild drop
- [x] **AUTH-12**: Webhooks do n8n validam que expert_id do payload corresponde ao token UAZAPI que enviou a requisição

### White-Label

- [x] **WLBL-01**: CSS Variables definidas no :root (--color-primary, --color-primary-hover, --color-primary-bg, --color-primary-light)
- [x] **WLBL-02**: No login, CSS Variables são sobrescritas com os valores do expert logado
- [x] **WLBL-03**: Todos os componentes que usam #10b981 (verde) migrados para usar var(--color-primary)
- [x] **WLBL-04**: Logo do expert exibida no topo do sidebar (onde hoje é "Allan Cabral / AUTOMAÇÕES")
- [x] **WLBL-05**: Nome da plataforma do expert exibido ao lado da logo no sidebar
- [ ] **WLBL-06**: Nome da assistente configurável por expert (onde aparece "Helena" nas mensagens do funil)
- [x] **WLBL-07**: Efeitos de fundo/gradientes sutis adaptam-se à cor primária do expert
- [x] **WLBL-08**: Layout, fontes (Inter/Outfit/JetBrains Mono), cores de superfície (#0a0a0a, #1a1a1a, #232328) e estrutura de componentes são idênticos entre experts

### Admin Master

- [x] **ADMN-01**: Rota /admin protegida acessível apenas por role `admin`
- [x] **ADMN-02**: Admin pode criar novo expert (nome, cor primária, cor secundária, logo, plano, nome assistente)
- [x] **ADMN-03**: Admin pode editar dados de qualquer expert
- [x] **ADMN-04**: Admin pode suspender/reativar expert (ativo: true/false)
- [x] **ADMN-05**: Admin pode criar usuário de acesso para expert (email + senha)
- [x] **ADMN-06**: Dashboard global com métricas consolidadas de todos experts (total leads, envios, conversões)
- [x] **ADMN-07**: Admin pode ver breakdown de métricas por expert individual
- [x] **ADMN-08**: Admin pode criar/editar planos com limites (max_leads, max_instancias, max_envios_mes, features_permitidas)
- [x] **ADMN-09**: Admin pode impersonar qualquer expert (ver o painel como se fosse o expert, para debug/suporte)
- [x] **ADMN-10**: Admin pode atribuir/remover instâncias UAZAPI a experts
- [x] **ADMN-11**: Admin pode configurar voice_id manualmente por expert

### Planos & Limites

- [x] **PLAN-01**: Plano Básico: 500 leads, 2 instâncias, 1000 envios/mês, agendamento
- [x] **PLAN-02**: Plano Pro: 2000 leads, 5 instâncias, 5000 envios/mês, agendamento + torneio + copy IA
- [x] **PLAN-03**: Plano Enterprise: ilimitado leads, 10 instâncias, envios ilimitados, todas as features
- [x] **PLAN-04**: Limites de leads são enforced (bloqueia criação de novo lead quando limite atingido)
- [x] **PLAN-05**: Limites de instâncias são enforced (bloqueia conexão de nova instância quando limite atingido)
- [x] **PLAN-06**: Limites de envios/mês são enforced com contador mensal (bloqueia envio quando limite atingido)
- [x] **PLAN-07**: Features bloqueadas por plano mostram indicador visual (ex: "Disponível no plano Pro")
- [x] **PLAN-08**: Valores dos planos são editáveis pelo admin master (não hardcoded)

### WhatsApp & Instâncias

- [x] **WAPP-01**: Instâncias UAZAPI vinculadas a expert_id na tabela whatsapp_rotacao
- [x] **WAPP-02**: Expert pode ver e gerenciar apenas suas próprias instâncias na Central WhatsApp
- [x] **WAPP-03**: Expert pode conectar/desconectar instâncias dentro do limite do seu plano
- [ ] **WAPP-04**: Admin master pode provisionar instâncias e atribuir a qualquer expert
- [x] **WAPP-05**: Rotação de números funciona apenas entre instâncias do mesmo expert
- [x] **WAPP-06**: Webhooks das instâncias carregam expert_id para filtrar no n8n

### N8N Workflows

- [ ] **N8N-01**: Workflows compartilhados recebem expert_id nos webhooks e filtram queries Supabase por expert_id
- [ ] **N8N-02**: Tabela configuracoes passa a ter expert_id (cada expert tem seus próprios links, tempos de follow-up, etc.)
- [ ] **N8N-03**: Workflows de envio de mensagem usam tokens UAZAPI do expert correto (não global)
- [ ] **N8N-04**: Workflow "Boas vindas - Leads Insta" filtra por expert_id do webhook recebido
- [ ] **N8N-05**: Workflow "Follow up - assistente" processa apenas leads do expert correspondente
- [ ] **N8N-06**: Workflow "Envio Mensagem - Saas" valida expert_id antes de enviar

### Voice (Minimax)

- [x] **VOIC-01**: Campo voice_id na tabela experts (preenchido manualmente pelo admin no MVP)
- [x] **VOIC-02**: Campo voice_settings (JSONB) na tabela experts com speed, pitch, timbre, vol
- [ ] **VOIC-03**: Workflows de áudio do funil usam voice_id e voice_settings do expert correspondente
- [x] **VOIC-04**: Se expert não tem voice_id configurado, opções de áudio são desabilitadas (sem fallback)

## v2 Requirements

### Voice Cloning Self-Service

- **VCLN-01**: Expert acessa seção "Configurar Voz" no seu painel
- **VCLN-02**: Expert faz upload de áudio MP3 (~30 segundos) com sua voz
- **VCLN-03**: Sistema chama Minimax Upload API (POST /v1/files/upload, purpose: voice_clone) e obtém file_id
- **VCLN-04**: Sistema chama Minimax Voice Clone API (POST /v1/voice_clone, file_id + voice_id customizado)
- **VCLN-05**: Sistema verifica status da voz via GET /v1/voice/get
- **VCLN-06**: Expert pode ouvir preview da voz clonada e aprovar/rejeitar
- **VCLN-07**: Aprovação salva voice_id na tabela experts automaticamente
- **VCLN-08**: A partir da aprovação, todos os áudios do funil usam a voz clonada do expert

### Analytics Avançado

- **ANLT-01**: Relatórios de conversão por expert com gráficos temporais
- **ANLT-02**: Comparativo de performance entre experts para admin master
- **ANLT-03**: Export de relatórios em PDF/CSV

### Billing Integrado

- **BILL-01**: Integração com gateway de pagamento para cobrança de planos
- **BILL-02**: Upgrade/downgrade de plano self-service pelo expert

## Out of Scope

| Feature | Reason |
|---------|--------|
| Domínio próprio por expert | Todos usam mesmo domínio, diferenciados pelo login |
| CSS/tema totalmente customizado por expert | Layout, fontes, cores de superfície são iguais para todos |
| Migração para Supabase Auth | Manter auth customizada existente que funciona |
| Workflows clonados por expert no n8n | Compartilhados com filtro é mais simples e manutenível |
| App separada para admin master | Integrado como /admin no mesmo SPA reduz overhead |
| Billing/pagamento integrado no v1 | Planos gerenciados manualmente pelo admin |
| Multi-idioma | Interface em português apenas |
| Mobile app nativo | Web-first, responsivo é suficiente |

## Traceability

| Requirement | Phase | Status |
|-------------|-------|--------|
| MTNT-01 | Phase 1 | Complete |
| MTNT-02 | Phase 1 | Complete |
| MTNT-03 | Phase 1 | Complete |
| MTNT-04 | Phase 1 | Complete |
| MTNT-05 | Phase 1 | Complete |
| AUTH-01 | Phase 2 | Complete |
| AUTH-02 | Phase 2 | Complete |
| AUTH-03 | Phase 2 | Complete |
| AUTH-04 | Phase 2 | Complete |
| AUTH-05 | Phase 2 | Complete |
| AUTH-06 | Phase 2 | Complete |
| AUTH-07 | Phase 2 | Complete |
| AUTH-08 | Phase 2 | Complete |
| AUTH-09 | Phase 2 | Complete |
| AUTH-10 | Phase 2 | Complete |
| AUTH-11 | Phase 2 | Complete |
| AUTH-12 | Phase 2 | Complete |
| WLBL-01 | Phase 4 | Complete |
| WLBL-02 | Phase 4 | Complete |
| WLBL-03 | Phase 4 | Complete |
| WLBL-04 | Phase 4 | Complete |
| WLBL-05 | Phase 4 | Complete |
| WLBL-06 | Phase 4 | Pending |
| WLBL-07 | Phase 4 | Complete |
| WLBL-08 | Phase 4 | Complete |
| ADMN-01 | Phase 3 | Complete |
| ADMN-02 | Phase 3 | Complete |
| ADMN-03 | Phase 3 | Complete |
| ADMN-04 | Phase 3 | Complete |
| ADMN-05 | Phase 3 | Complete |
| ADMN-06 | Phase 3 | Complete |
| ADMN-07 | Phase 3 | Complete |
| ADMN-08 | Phase 3 | Complete |
| ADMN-09 | Phase 3 | Complete |
| ADMN-10 | Phase 3 | Complete |
| ADMN-11 | Phase 3 | Complete |
| PLAN-01 | Phase 3 | Complete |
| PLAN-02 | Phase 3 | Complete |
| PLAN-03 | Phase 3 | Complete |
| PLAN-04 | Phase 4 | Complete |
| PLAN-05 | Phase 4 | Complete |
| PLAN-06 | Phase 4 | Complete |
| PLAN-07 | Phase 4 | Complete |
| PLAN-08 | Phase 3 | Complete |
| WAPP-01 | Phase 5 | Complete |
| WAPP-02 | Phase 5 | Complete |
| WAPP-03 | Phase 5 | Complete |
| WAPP-04 | Phase 5 | Pending |
| WAPP-05 | Phase 5 | Complete |
| WAPP-06 | Phase 5 | Complete |
| N8N-01 | Phase 5 | Pending |
| N8N-02 | Phase 5 | Pending |
| N8N-03 | Phase 5 | Pending |
| N8N-04 | Phase 5 | Pending |
| N8N-05 | Phase 5 | Pending |
| N8N-06 | Phase 5 | Pending |
| VOIC-01 | Phase 5 | Complete |
| VOIC-02 | Phase 5 | Complete |
| VOIC-03 | Phase 5 | Pending |
| VOIC-04 | Phase 5 | Complete |

**Coverage:**
- v1 requirements: 60 total
- Mapped to phases: 60
- Unmapped: 0

---
*Requirements defined: 2026-03-27*
*Last updated: 2026-03-28 — VOIC-04 updated per D-12 (no fallback, audio disabled when no voice_id)*
