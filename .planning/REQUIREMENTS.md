# Requirements: Dashboard Leads — Multi-Tenant White-Label

**Defined:** 2026-03-27
**Core Value:** Isolamento seguro de dados entre experts — um expert NUNCA pode ver, modificar ou interagir com dados de outro expert, enquanto a agência (admin master) tem visibilidade e controle total sobre todos.

## v1 Requirements

### Multi-Tenant Core

- [ ] **MTNT-01**: Tabela `experts` criada com campos: nome, slug, cor_primaria, cor_secundaria, logo_url, nome_plataforma, nome_assistente, voice_id, voice_settings (JSONB), plano_id, ativo, created_at
- [ ] **MTNT-02**: Tabela `planos` criada com campos: nome, max_leads, max_instancias, max_envios_mes, features_permitidas (JSONB), ativo, created_at
- [ ] **MTNT-03**: Coluna `expert_id` (UUID, NOT NULL, FK → experts.id) adicionada em todas as tabelas relevantes: leads, mensagens, followups_enviados, notificacoes, templates_mensagem, configuracoes, mensagens_funil_v2, whatsapp_rotacao, whatsapp_rotacao_config, whatsapp_rotacao_mensagens, whatsapp_eventos_log, moderacao_grupos, moderacao_strikes, moderacao_log, agendamentos_mensagens, agendamentos_grupos, torneios, participantes, greens, log_imagens, copys_geradas, expert_perfil, blacklist_grupos, grupos_ignorar_coleta, telegram_canais, documents
- [ ] **MTNT-04**: Todos os 1762 leads existentes e dados relacionados migrados com expert_id do Allan (Expert #1)
- [ ] **MTNT-05**: Índices criados em expert_id para todas as tabelas relevantes (performance de queries filtradas)

### Auth & Security

- [ ] **AUTH-01**: Admin master pode fazer login com role `admin` e acessar rota /admin
- [ ] **AUTH-02**: Expert pode fazer login com role `expert` e ver apenas seu painel personalizado
- [ ] **AUTH-03**: Login vincula expert_id à sessão (armazenado no localStorage com expiração 24h)
- [ ] **AUTH-04**: Rate limiting no login com delay progressivo contra brute force (1s, 2s, 4s, 8s...)
- [ ] **AUTH-05**: RLS policies no Supabase filtram por expert_id em TODAS as tabelas (SELECT, INSERT, UPDATE, DELETE)
- [ ] **AUTH-06**: Um expert não consegue acessar, ver ou modificar dados de outro expert via API direta
- [ ] **AUTH-07**: RPCs do Supabase validam expert_id server-side (não confiam no frontend)
- [ ] **AUTH-08**: Nenhuma chave sensível exposta no frontend (service_role_key, tokens UAZAPI, API keys Minimax)
- [ ] **AUTH-09**: Inputs sanitizados contra XSS em todos os formulários e campos de texto
- [ ] **AUTH-10**: CSP headers configurados via meta tags no index.html
- [ ] **AUTH-11**: Console.log removidos no build de produção via esbuild drop
- [ ] **AUTH-12**: Webhooks do n8n validam que expert_id do payload corresponde ao token UAZAPI que enviou a requisição

### White-Label

- [ ] **WLBL-01**: CSS Variables definidas no :root (--color-primary, --color-primary-hover, --color-primary-bg, --color-primary-light)
- [ ] **WLBL-02**: No login, CSS Variables são sobrescritas com os valores do expert logado
- [ ] **WLBL-03**: Todos os componentes que usam #10b981 (verde) migrados para usar var(--color-primary)
- [ ] **WLBL-04**: Logo do expert exibida no topo do sidebar (onde hoje é "Allan Cabral / AUTOMAÇÕES")
- [ ] **WLBL-05**: Nome da plataforma do expert exibido ao lado da logo no sidebar
- [ ] **WLBL-06**: Nome da assistente configurável por expert (onde aparece "Helena" nas mensagens do funil)
- [ ] **WLBL-07**: Efeitos de fundo/gradientes sutis adaptam-se à cor primária do expert
- [ ] **WLBL-08**: Layout, fontes (Inter/Outfit/JetBrains Mono), cores de superfície (#0a0a0a, #1a1a1a, #232328) e estrutura de componentes são idênticos entre experts

### Admin Master

- [ ] **ADMN-01**: Rota /admin protegida acessível apenas por role `admin`
- [ ] **ADMN-02**: Admin pode criar novo expert (nome, cor primária, cor secundária, logo, plano, nome assistente)
- [ ] **ADMN-03**: Admin pode editar dados de qualquer expert
- [ ] **ADMN-04**: Admin pode suspender/reativar expert (ativo: true/false)
- [ ] **ADMN-05**: Admin pode criar usuário de acesso para expert (email + senha)
- [ ] **ADMN-06**: Dashboard global com métricas consolidadas de todos experts (total leads, envios, conversões)
- [ ] **ADMN-07**: Admin pode ver breakdown de métricas por expert individual
- [ ] **ADMN-08**: Admin pode criar/editar planos com limites (max_leads, max_instancias, max_envios_mes, features_permitidas)
- [ ] **ADMN-09**: Admin pode impersonar qualquer expert (ver o painel como se fosse o expert, para debug/suporte)
- [ ] **ADMN-10**: Admin pode atribuir/remover instâncias UAZAPI a experts
- [ ] **ADMN-11**: Admin pode configurar voice_id manualmente por expert

### Planos & Limites

- [ ] **PLAN-01**: Plano Básico: 500 leads, 2 instâncias, 1000 envios/mês, agendamento
- [ ] **PLAN-02**: Plano Pro: 2000 leads, 5 instâncias, 5000 envios/mês, agendamento + torneio + copy IA
- [ ] **PLAN-03**: Plano Enterprise: ilimitado leads, 10 instâncias, envios ilimitados, todas as features
- [ ] **PLAN-04**: Limites de leads são enforced (bloqueia criação de novo lead quando limite atingido)
- [ ] **PLAN-05**: Limites de instâncias são enforced (bloqueia conexão de nova instância quando limite atingido)
- [ ] **PLAN-06**: Limites de envios/mês são enforced com contador mensal (bloqueia envio quando limite atingido)
- [ ] **PLAN-07**: Features bloqueadas por plano mostram indicador visual (ex: "Disponível no plano Pro")
- [ ] **PLAN-08**: Valores dos planos são editáveis pelo admin master (não hardcoded)

### WhatsApp & Instâncias

- [ ] **WAPP-01**: Instâncias UAZAPI vinculadas a expert_id na tabela whatsapp_rotacao
- [ ] **WAPP-02**: Expert pode ver e gerenciar apenas suas próprias instâncias na Central WhatsApp
- [ ] **WAPP-03**: Expert pode conectar/desconectar instâncias dentro do limite do seu plano
- [ ] **WAPP-04**: Admin master pode provisionar instâncias e atribuir a qualquer expert
- [ ] **WAPP-05**: Rotação de números funciona apenas entre instâncias do mesmo expert
- [ ] **WAPP-06**: Webhooks das instâncias carregam expert_id para filtrar no n8n

### N8N Workflows

- [ ] **N8N-01**: Workflows compartilhados recebem expert_id nos webhooks e filtram queries Supabase por expert_id
- [ ] **N8N-02**: Tabela configuracoes passa a ter expert_id (cada expert tem seus próprios links, tempos de follow-up, etc.)
- [ ] **N8N-03**: Workflows de envio de mensagem usam tokens UAZAPI do expert correto (não global)
- [ ] **N8N-04**: Workflow "Boas vindas - Leads Insta" filtra por expert_id do webhook recebido
- [ ] **N8N-05**: Workflow "Follow up - assistente" processa apenas leads do expert correspondente
- [ ] **N8N-06**: Workflow "Envio Mensagem - Saas" valida expert_id antes de enviar

### Voice (Minimax)

- [ ] **VOIC-01**: Campo voice_id na tabela experts (preenchido manualmente pelo admin no MVP)
- [ ] **VOIC-02**: Campo voice_settings (JSONB) na tabela experts com speed, pitch, timbre, vol
- [ ] **VOIC-03**: Workflows de áudio do funil usam voice_id e voice_settings do expert correspondente
- [ ] **VOIC-04**: Se expert não tem voice_id configurado, fallback para voz padrão do sistema

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

<!-- Populated during roadmap creation -->

| Requirement | Phase | Status |
|-------------|-------|--------|
| — | — | — |

**Coverage:**
- v1 requirements: 55 total
- Mapped to phases: 0
- Unmapped: 55 (pending roadmap)

---
*Requirements defined: 2026-03-27*
*Last updated: 2026-03-27 after initial definition*
