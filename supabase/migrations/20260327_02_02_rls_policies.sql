-- ============================================================
-- Phase 02 Plan 02: RLS Policies for All 26 Tenant Tables
-- Enable Row Level Security with expert_id filtering using
-- transition policies (allow when app.expert_id not set).
-- ============================================================

-- 1. Drop all existing RLS policies on tenant tables
DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN
    SELECT schemaname, tablename, policyname
    FROM pg_policies
    WHERE schemaname = 'public'
    AND tablename IN (
      'leads', 'mensagens', 'followups_enviados', 'notificacoes', 'templates_mensagem',
      'configuracoes', 'mensagens_funil_v2', 'whatsapp_rotacao', 'whatsapp_rotacao_config',
      'whatsapp_rotacao_mensagens', 'whatsapp_eventos_log', 'moderacao_grupos',
      'moderacao_strikes', 'moderacao_log', 'agendamentos_mensagens', 'agendamentos_grupos',
      'torneios', 'participantes', 'greens', 'log_imagens', 'copys_geradas', 'expert_perfil',
      'blacklist_grupos', 'grupos_ignorar_coleta', 'telegram_canais', 'documents'
    )
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON %I.%I', r.policyname, r.schemaname, r.tablename);
  END LOOP;
END $$;

-- 2. Enable RLS on all 26 tenant tables
ALTER TABLE leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE mensagens ENABLE ROW LEVEL SECURITY;
ALTER TABLE followups_enviados ENABLE ROW LEVEL SECURITY;
ALTER TABLE notificacoes ENABLE ROW LEVEL SECURITY;
ALTER TABLE templates_mensagem ENABLE ROW LEVEL SECURITY;
ALTER TABLE configuracoes ENABLE ROW LEVEL SECURITY;
ALTER TABLE mensagens_funil_v2 ENABLE ROW LEVEL SECURITY;
ALTER TABLE whatsapp_rotacao ENABLE ROW LEVEL SECURITY;
ALTER TABLE whatsapp_rotacao_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE whatsapp_rotacao_mensagens ENABLE ROW LEVEL SECURITY;
ALTER TABLE whatsapp_eventos_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE moderacao_grupos ENABLE ROW LEVEL SECURITY;
ALTER TABLE moderacao_strikes ENABLE ROW LEVEL SECURITY;
ALTER TABLE moderacao_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE agendamentos_mensagens ENABLE ROW LEVEL SECURITY;
ALTER TABLE agendamentos_grupos ENABLE ROW LEVEL SECURITY;
ALTER TABLE torneios ENABLE ROW LEVEL SECURITY;
ALTER TABLE participantes ENABLE ROW LEVEL SECURITY;
ALTER TABLE greens ENABLE ROW LEVEL SECURITY;
ALTER TABLE log_imagens ENABLE ROW LEVEL SECURITY;
ALTER TABLE copys_geradas ENABLE ROW LEVEL SECURITY;
ALTER TABLE expert_perfil ENABLE ROW LEVEL SECURITY;
ALTER TABLE blacklist_grupos ENABLE ROW LEVEL SECURITY;
ALTER TABLE grupos_ignorar_coleta ENABLE ROW LEVEL SECURITY;
ALTER TABLE telegram_canais ENABLE ROW LEVEL SECURITY;
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;

-- 3. Create expert-scoped transition policies (SELECT, INSERT, UPDATE, DELETE)
-- Transition policy logic:
--   - current_setting('app.expert_id', true) IS NULL => allow (no context set, transition mode)
--   - current_setting('app.expert_id', true) = '' => allow (empty context, transition mode)
--   - expert_id::TEXT = current_setting('app.expert_id', true) => filter by expert
-- This ensures existing direct .from() queries keep working while RPCs get isolation.
DO $$
DECLARE
  tbl TEXT;
  tables TEXT[] := ARRAY[
    'leads', 'mensagens', 'followups_enviados', 'notificacoes', 'templates_mensagem',
    'configuracoes', 'mensagens_funil_v2', 'whatsapp_rotacao', 'whatsapp_rotacao_config',
    'whatsapp_rotacao_mensagens', 'whatsapp_eventos_log', 'moderacao_grupos',
    'moderacao_strikes', 'moderacao_log', 'agendamentos_mensagens', 'agendamentos_grupos',
    'torneios', 'participantes', 'greens', 'log_imagens', 'copys_geradas', 'expert_perfil',
    'blacklist_grupos', 'grupos_ignorar_coleta', 'telegram_canais', 'documents'
  ];
BEGIN
  FOREACH tbl IN ARRAY tables LOOP
    -- SELECT policy
    EXECUTE format(
      'CREATE POLICY expert_select_%1$s ON %1$I FOR SELECT USING (
        current_setting(''app.expert_id'', true) IS NULL
        OR current_setting(''app.expert_id'', true) = ''''
        OR expert_id::TEXT = current_setting(''app.expert_id'', true)
      )',
      tbl
    );

    -- INSERT policy
    EXECUTE format(
      'CREATE POLICY expert_insert_%1$s ON %1$I FOR INSERT WITH CHECK (
        current_setting(''app.expert_id'', true) IS NULL
        OR current_setting(''app.expert_id'', true) = ''''
        OR expert_id::TEXT = current_setting(''app.expert_id'', true)
      )',
      tbl
    );

    -- UPDATE policy (USING + WITH CHECK)
    EXECUTE format(
      'CREATE POLICY expert_update_%1$s ON %1$I FOR UPDATE USING (
        current_setting(''app.expert_id'', true) IS NULL
        OR current_setting(''app.expert_id'', true) = ''''
        OR expert_id::TEXT = current_setting(''app.expert_id'', true)
      ) WITH CHECK (
        current_setting(''app.expert_id'', true) IS NULL
        OR current_setting(''app.expert_id'', true) = ''''
        OR expert_id::TEXT = current_setting(''app.expert_id'', true)
      )',
      tbl
    );

    -- DELETE policy
    EXECUTE format(
      'CREATE POLICY expert_delete_%1$s ON %1$I FOR DELETE USING (
        current_setting(''app.expert_id'', true) IS NULL
        OR current_setting(''app.expert_id'', true) = ''''
        OR expert_id::TEXT = current_setting(''app.expert_id'', true)
      )',
      tbl
    );
  END LOOP;
END $$;

-- 4. Force RLS even for table owner (prevents bypass)
-- Note: service_role key ALWAYS bypasses RLS regardless of FORCE (per D-03)
DO $$
DECLARE
  tbl TEXT;
  tables TEXT[] := ARRAY[
    'leads', 'mensagens', 'followups_enviados', 'notificacoes', 'templates_mensagem',
    'configuracoes', 'mensagens_funil_v2', 'whatsapp_rotacao', 'whatsapp_rotacao_config',
    'whatsapp_rotacao_mensagens', 'whatsapp_eventos_log', 'moderacao_grupos',
    'moderacao_strikes', 'moderacao_log', 'agendamentos_mensagens', 'agendamentos_grupos',
    'torneios', 'participantes', 'greens', 'log_imagens', 'copys_geradas', 'expert_perfil',
    'blacklist_grupos', 'grupos_ignorar_coleta', 'telegram_canais', 'documents'
  ];
BEGIN
  FOREACH tbl IN ARRAY tables LOOP
    EXECUTE format('ALTER TABLE %I FORCE ROW LEVEL SECURITY', tbl);
  END LOOP;
END $$;
