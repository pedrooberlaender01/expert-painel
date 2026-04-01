# Phase 6: Controle de Secoes por Expert - Context

**Gathered:** 2026-04-01
**Status:** Ready for planning

<domain>
## Phase Boundary

Admin pode habilitar/desabilitar seções individuais do painel por expert. As 8 seções controláveis são: Dashboard, Conversas, Leads Assistente, Grupos, Envios, Torneios, Mensagens, Central WhatsApp. Coluna JSONB na tabela `experts`, UI de cards com toggle no formulário admin, sidebar e rotas respeitam a configuração.

</domain>

<decisions>
## Implementation Decisions

### Estrutura de dados
- **D-01:** Coluna `secoes_habilitadas JSONB` na tabela `experts` com formato objeto: `{"dashboard": true, "conversas": true, "leads": true, "grupos": true, "envios": true, "torneios": true, "mensagens": true, "central_whatsapp": true}`
- **D-02:** `NULL` = tudo habilitado (consistente com padrão `features_permitidas` do plano onde null = tudo liberado). Só grava JSONB quando admin customiza.
- **D-03:** DEFAULT da coluna é `NULL` — experts existentes e novos têm todas as seções habilitadas automaticamente.

### Interação com plano
- **D-04:** Dois sistemas independentes. Se admin desabilitou a seção via `secoes_habilitadas`, a seção some/fica desabilitada independente do plano. Se a seção está habilitada, o plano ainda pode mostrar cadeado para features específicas (ex: Torneio habilitado na seção mas bloqueado pelo Plano Básico continua com cadeado).
- **D-05:** `secoes_habilitadas` controla VISIBILIDADE da seção. `features_permitidas` controla ACESSO à feature dentro da seção. São camadas diferentes.

### UI do admin
- **D-06:** Nova seção "Seções do Painel" no formulário de criar/editar expert com cards pequenos (ícone + nome + toggle switch) para cada uma das 8 seções.
- **D-07:** Posicionamento: após a seção de Plano e antes de Credenciais de Acesso.
- **D-08:** Quando `secoes_habilitadas` é NULL (default), todos os toggles aparecem como ligados. Ao desligar qualquer um, o JSONB é gravado com o estado completo.

### Comportamento no frontend
- **D-09:** Seção desabilitada aparece no sidebar com visual de bloqueada (cinza + cadeado) e indicação de não disponível. Expert vê que existe mas não acessa.
- **D-10:** Se expert tentar acessar rota de seção desabilitada diretamente pela URL, redireciona silenciosamente para /dashboard.
- **D-11:** Configurações e Notificações NÃO são controláveis — sempre visíveis para todos os experts.

### Claude's Discretion
- Hook/utility para checar seções habilitadas — Claude decide a melhor abordagem (hook dedicado, extensão do useFeatureGate, ou lógica inline)
- Nomes internos das chaves JSONB (ex: "leads" vs "leads_assistente", "central_whatsapp" vs "whatsapp") — Claude decide nomes que façam sentido com as rotas existentes
- Como integrar com RPCs admin existentes (admin_create_expert, admin_update_expert) — Claude decide se atualiza as RPCs ou usa update direto

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Frontend - Sidebar e rotas
- `src/components/Sidebar.tsx` — NavItem interface (L16-21), items array (L30-40), feature gating render (L98-129)
- `src/App.tsx` — Route definitions, ProtectedRoute usage
- `src/hooks/useFeatureGate.ts` — FeatureKey type (L4), FEATURE_PLAN_MAP (L7-13), PATH_FEATURE_MAP (L16-22)

### Admin CRUD
- `src/pages/admin/AdminExpertForm.tsx` — Formulário de expert com 9 seções, posição para nova seção após Plano
- `src/types/admin.ts` — ExpertFormData interface (L16-31)
- `src/hooks/useAdminExperts.ts` — Hook com operações CRUD de expert

### Types e Store
- `src/types/index.ts` — ExpertProfile interface (L53-74), precisa adicionar secoes_habilitadas
- `src/types/database.ts` — ExpertRow interface (L269-284), precisa adicionar secoes_habilitadas
- `src/stores/authStore.ts` — AuthState, padrão `impersonatedExpert || user?.expert`

### Database
- `supabase/migrations/20260327_01_01_create_planos_and_experts_tables.sql` — Schema original da tabela experts

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- **NavItem interface** (Sidebar.tsx): Já tem `featureKey` opcional — novo campo `sectionKey` ou lógica de seção pode seguir padrão similar
- **useFeatureGate hook**: Padrão de gating já existe — seções podem usar approach similar (null = tudo habilitado)
- **PATH_FEATURE_MAP**: Mapeamento rota→feature já existe — pode ser estendido ou ter equivalente para seções
- **Lock icon + tooltip**: Visual de item bloqueado já implementado no sidebar (Phase 4)

### Established Patterns
- **null = tudo habilitado**: Padrão usado em `features_permitidas` do plano — `secoes_habilitadas` segue mesmo padrão
- **ExpertProfile nested in authStore**: Expert data acessado via `impersonatedExpert || user?.expert` em toda a app
- **Admin RPCs**: CRUD via `admin_create_expert`, `admin_update_expert` — precisam receber novo campo
- **Toggle/Switch components**: Formulário admin já usa padrões de input — cards com toggle são novos

### Integration Points
- **Sidebar.tsx**: Filtrar/desabilitar items baseado em `secoes_habilitadas` do expert logado
- **App.tsx routes**: Adicionar guard de seção em rotas protegidas (redirect para /dashboard)
- **AdminExpertForm.tsx**: Nova seção de cards com toggles após Plano
- **admin_create_expert / admin_update_expert RPCs**: Aceitar novo campo `secoes_habilitadas`
- **ExpertProfile type**: Adicionar campo `secoes_habilitadas` com tipo correto

</code_context>

<specifics>
## Specific Ideas

- Cards com ícone + nome + toggle switch para cada seção no admin form
- Visual consistente com o bloqueio por plano (cadeado cinza) mas com mensagem diferente para distinguir "bloqueado pelo plano" vs "desabilitado pelo admin"
- As 8 seções controláveis: Dashboard, Conversas, Leads Assistente, Grupos, Envios, Torneios, Mensagens, Central WhatsApp
- Configurações e Notificações sempre visíveis (não controláveis)

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 06-controle-de-secoes-por-expert*
*Context gathered: 2026-04-01*
