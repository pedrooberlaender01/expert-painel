-- Migration: add_expert_id_to_all_tables
-- Phase 1, Plan 02 -- Add expert_id NULLABLE column + index to all tenant tables
-- Column is NULLABLE now; Plan 03 will backfill then set NOT NULL + FK
-- Applied via Supabase Management API on 2026-03-27

-- 1. leads
ALTER TABLE leads ADD COLUMN IF NOT EXISTS expert_id UUID;
CREATE INDEX IF NOT EXISTS idx_leads_expert_id ON leads(expert_id);

-- 2. mensagens
ALTER TABLE mensagens ADD COLUMN IF NOT EXISTS expert_id UUID;
CREATE INDEX IF NOT EXISTS idx_mensagens_expert_id ON mensagens(expert_id);

-- 3. followups_enviados
ALTER TABLE followups_enviados ADD COLUMN IF NOT EXISTS expert_id UUID;
CREATE INDEX IF NOT EXISTS idx_followups_enviados_expert_id ON followups_enviados(expert_id);

-- 4. notificacoes
ALTER TABLE notificacoes ADD COLUMN IF NOT EXISTS expert_id UUID;
CREATE INDEX IF NOT EXISTS idx_notificacoes_expert_id ON notificacoes(expert_id);

-- 5. templates_mensagem
ALTER TABLE templates_mensagem ADD COLUMN IF NOT EXISTS expert_id UUID;
CREATE INDEX IF NOT EXISTS idx_templates_mensagem_expert_id ON templates_mensagem(expert_id);

-- 6. configuracoes
ALTER TABLE configuracoes ADD COLUMN IF NOT EXISTS expert_id UUID;
CREATE INDEX IF NOT EXISTS idx_configuracoes_expert_id ON configuracoes(expert_id);

-- 7. mensagens_funil_v2
ALTER TABLE mensagens_funil_v2 ADD COLUMN IF NOT EXISTS expert_id UUID;
CREATE INDEX IF NOT EXISTS idx_mensagens_funil_v2_expert_id ON mensagens_funil_v2(expert_id);

-- 8. whatsapp_rotacao
ALTER TABLE whatsapp_rotacao ADD COLUMN IF NOT EXISTS expert_id UUID;
CREATE INDEX IF NOT EXISTS idx_whatsapp_rotacao_expert_id ON whatsapp_rotacao(expert_id);

-- 9. whatsapp_rotacao_config
ALTER TABLE whatsapp_rotacao_config ADD COLUMN IF NOT EXISTS expert_id UUID;
CREATE INDEX IF NOT EXISTS idx_whatsapp_rotacao_config_expert_id ON whatsapp_rotacao_config(expert_id);

-- 10. whatsapp_rotacao_mensagens
ALTER TABLE whatsapp_rotacao_mensagens ADD COLUMN IF NOT EXISTS expert_id UUID;
CREATE INDEX IF NOT EXISTS idx_whatsapp_rotacao_mensagens_expert_id ON whatsapp_rotacao_mensagens(expert_id);

-- 11. whatsapp_eventos_log
ALTER TABLE whatsapp_eventos_log ADD COLUMN IF NOT EXISTS expert_id UUID;
CREATE INDEX IF NOT EXISTS idx_whatsapp_eventos_log_expert_id ON whatsapp_eventos_log(expert_id);

-- 12. moderacao_grupos
ALTER TABLE moderacao_grupos ADD COLUMN IF NOT EXISTS expert_id UUID;
CREATE INDEX IF NOT EXISTS idx_moderacao_grupos_expert_id ON moderacao_grupos(expert_id);

-- 13. moderacao_strikes
ALTER TABLE moderacao_strikes ADD COLUMN IF NOT EXISTS expert_id UUID;
CREATE INDEX IF NOT EXISTS idx_moderacao_strikes_expert_id ON moderacao_strikes(expert_id);

-- 14. moderacao_log
ALTER TABLE moderacao_log ADD COLUMN IF NOT EXISTS expert_id UUID;
CREATE INDEX IF NOT EXISTS idx_moderacao_log_expert_id ON moderacao_log(expert_id);

-- 15. agendamentos_mensagens
ALTER TABLE agendamentos_mensagens ADD COLUMN IF NOT EXISTS expert_id UUID;
CREATE INDEX IF NOT EXISTS idx_agendamentos_mensagens_expert_id ON agendamentos_mensagens(expert_id);

-- 16. agendamentos_grupos
ALTER TABLE agendamentos_grupos ADD COLUMN IF NOT EXISTS expert_id UUID;
CREATE INDEX IF NOT EXISTS idx_agendamentos_grupos_expert_id ON agendamentos_grupos(expert_id);

-- 17. torneios
ALTER TABLE torneios ADD COLUMN IF NOT EXISTS expert_id UUID;
CREATE INDEX IF NOT EXISTS idx_torneios_expert_id ON torneios(expert_id);

-- 18. participantes
ALTER TABLE participantes ADD COLUMN IF NOT EXISTS expert_id UUID;
CREATE INDEX IF NOT EXISTS idx_participantes_expert_id ON participantes(expert_id);

-- 19. greens
ALTER TABLE greens ADD COLUMN IF NOT EXISTS expert_id UUID;
CREATE INDEX IF NOT EXISTS idx_greens_expert_id ON greens(expert_id);

-- 20. log_imagens
ALTER TABLE log_imagens ADD COLUMN IF NOT EXISTS expert_id UUID;
CREATE INDEX IF NOT EXISTS idx_log_imagens_expert_id ON log_imagens(expert_id);

-- 21. copys_geradas
ALTER TABLE copys_geradas ADD COLUMN IF NOT EXISTS expert_id UUID;
CREATE INDEX IF NOT EXISTS idx_copys_geradas_expert_id ON copys_geradas(expert_id);

-- 22. expert_perfil
ALTER TABLE expert_perfil ADD COLUMN IF NOT EXISTS expert_id UUID;
CREATE INDEX IF NOT EXISTS idx_expert_perfil_expert_id ON expert_perfil(expert_id);

-- 23. blacklist_grupos
ALTER TABLE blacklist_grupos ADD COLUMN IF NOT EXISTS expert_id UUID;
CREATE INDEX IF NOT EXISTS idx_blacklist_grupos_expert_id ON blacklist_grupos(expert_id);

-- 24. grupos_ignorar_coleta
ALTER TABLE grupos_ignorar_coleta ADD COLUMN IF NOT EXISTS expert_id UUID;
CREATE INDEX IF NOT EXISTS idx_grupos_ignorar_coleta_expert_id ON grupos_ignorar_coleta(expert_id);

-- 25. telegram_canais
ALTER TABLE telegram_canais ADD COLUMN IF NOT EXISTS expert_id UUID;
CREATE INDEX IF NOT EXISTS idx_telegram_canais_expert_id ON telegram_canais(expert_id);

-- 26. documents
ALTER TABLE documents ADD COLUMN IF NOT EXISTS expert_id UUID;
CREATE INDEX IF NOT EXISTS idx_documents_expert_id ON documents(expert_id);
