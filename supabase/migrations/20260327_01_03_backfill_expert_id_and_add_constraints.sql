-- Migration: backfill_expert_id_and_add_constraints
-- Phase 1, Plan 03 — Backfill all rows with Allan's expert_id, then constrain

DO $$
DECLARE
  v_expert_id UUID;
BEGIN
  SELECT id INTO v_expert_id FROM experts WHERE slug = 'allan-cabral';

  IF v_expert_id IS NULL THEN
    RAISE EXCEPTION 'Expert allan-cabral not found. Run Plan 01-01 first.';
  END IF;

  -- === BACKFILL all tables ===
  UPDATE leads SET expert_id = v_expert_id WHERE expert_id IS NULL;
  UPDATE mensagens SET expert_id = v_expert_id WHERE expert_id IS NULL;
  UPDATE followups_enviados SET expert_id = v_expert_id WHERE expert_id IS NULL;
  UPDATE notificacoes SET expert_id = v_expert_id WHERE expert_id IS NULL;
  UPDATE templates_mensagem SET expert_id = v_expert_id WHERE expert_id IS NULL;
  UPDATE configuracoes SET expert_id = v_expert_id WHERE expert_id IS NULL;
  UPDATE mensagens_funil_v2 SET expert_id = v_expert_id WHERE expert_id IS NULL;
  UPDATE whatsapp_rotacao SET expert_id = v_expert_id WHERE expert_id IS NULL;
  UPDATE whatsapp_rotacao_config SET expert_id = v_expert_id WHERE expert_id IS NULL;
  UPDATE whatsapp_rotacao_mensagens SET expert_id = v_expert_id WHERE expert_id IS NULL;
  UPDATE whatsapp_eventos_log SET expert_id = v_expert_id WHERE expert_id IS NULL;
  UPDATE moderacao_grupos SET expert_id = v_expert_id WHERE expert_id IS NULL;
  UPDATE moderacao_strikes SET expert_id = v_expert_id WHERE expert_id IS NULL;
  UPDATE moderacao_log SET expert_id = v_expert_id WHERE expert_id IS NULL;
  UPDATE agendamentos_mensagens SET expert_id = v_expert_id WHERE expert_id IS NULL;
  UPDATE agendamentos_grupos SET expert_id = v_expert_id WHERE expert_id IS NULL;
  UPDATE torneios SET expert_id = v_expert_id WHERE expert_id IS NULL;
  UPDATE participantes SET expert_id = v_expert_id WHERE expert_id IS NULL;
  UPDATE greens SET expert_id = v_expert_id WHERE expert_id IS NULL;
  UPDATE log_imagens SET expert_id = v_expert_id WHERE expert_id IS NULL;
  UPDATE copys_geradas SET expert_id = v_expert_id WHERE expert_id IS NULL;
  UPDATE expert_perfil SET expert_id = v_expert_id WHERE expert_id IS NULL;
  UPDATE blacklist_grupos SET expert_id = v_expert_id WHERE expert_id IS NULL;
  UPDATE grupos_ignorar_coleta SET expert_id = v_expert_id WHERE expert_id IS NULL;
  UPDATE telegram_canais SET expert_id = v_expert_id WHERE expert_id IS NULL;
  UPDATE documents SET expert_id = v_expert_id WHERE expert_id IS NULL;

  -- === SET NOT NULL on all tables ===
  ALTER TABLE leads ALTER COLUMN expert_id SET NOT NULL;
  ALTER TABLE mensagens ALTER COLUMN expert_id SET NOT NULL;
  ALTER TABLE followups_enviados ALTER COLUMN expert_id SET NOT NULL;
  ALTER TABLE notificacoes ALTER COLUMN expert_id SET NOT NULL;
  ALTER TABLE templates_mensagem ALTER COLUMN expert_id SET NOT NULL;
  ALTER TABLE configuracoes ALTER COLUMN expert_id SET NOT NULL;
  ALTER TABLE mensagens_funil_v2 ALTER COLUMN expert_id SET NOT NULL;
  ALTER TABLE whatsapp_rotacao ALTER COLUMN expert_id SET NOT NULL;
  ALTER TABLE whatsapp_rotacao_config ALTER COLUMN expert_id SET NOT NULL;
  ALTER TABLE whatsapp_rotacao_mensagens ALTER COLUMN expert_id SET NOT NULL;
  ALTER TABLE whatsapp_eventos_log ALTER COLUMN expert_id SET NOT NULL;
  ALTER TABLE moderacao_grupos ALTER COLUMN expert_id SET NOT NULL;
  ALTER TABLE moderacao_strikes ALTER COLUMN expert_id SET NOT NULL;
  ALTER TABLE moderacao_log ALTER COLUMN expert_id SET NOT NULL;
  ALTER TABLE agendamentos_mensagens ALTER COLUMN expert_id SET NOT NULL;
  ALTER TABLE agendamentos_grupos ALTER COLUMN expert_id SET NOT NULL;
  ALTER TABLE torneios ALTER COLUMN expert_id SET NOT NULL;
  ALTER TABLE participantes ALTER COLUMN expert_id SET NOT NULL;
  ALTER TABLE greens ALTER COLUMN expert_id SET NOT NULL;
  ALTER TABLE log_imagens ALTER COLUMN expert_id SET NOT NULL;
  ALTER TABLE copys_geradas ALTER COLUMN expert_id SET NOT NULL;
  ALTER TABLE expert_perfil ALTER COLUMN expert_id SET NOT NULL;
  ALTER TABLE blacklist_grupos ALTER COLUMN expert_id SET NOT NULL;
  ALTER TABLE grupos_ignorar_coleta ALTER COLUMN expert_id SET NOT NULL;
  ALTER TABLE telegram_canais ALTER COLUMN expert_id SET NOT NULL;
  ALTER TABLE documents ALTER COLUMN expert_id SET NOT NULL;

  -- === ADD FK constraints ===
  ALTER TABLE leads ADD CONSTRAINT fk_leads_expert FOREIGN KEY (expert_id) REFERENCES experts(id);
  ALTER TABLE mensagens ADD CONSTRAINT fk_mensagens_expert FOREIGN KEY (expert_id) REFERENCES experts(id);
  ALTER TABLE followups_enviados ADD CONSTRAINT fk_followups_enviados_expert FOREIGN KEY (expert_id) REFERENCES experts(id);
  ALTER TABLE notificacoes ADD CONSTRAINT fk_notificacoes_expert FOREIGN KEY (expert_id) REFERENCES experts(id);
  ALTER TABLE templates_mensagem ADD CONSTRAINT fk_templates_mensagem_expert FOREIGN KEY (expert_id) REFERENCES experts(id);
  ALTER TABLE configuracoes ADD CONSTRAINT fk_configuracoes_expert FOREIGN KEY (expert_id) REFERENCES experts(id);
  ALTER TABLE mensagens_funil_v2 ADD CONSTRAINT fk_mensagens_funil_v2_expert FOREIGN KEY (expert_id) REFERENCES experts(id);
  ALTER TABLE whatsapp_rotacao ADD CONSTRAINT fk_whatsapp_rotacao_expert FOREIGN KEY (expert_id) REFERENCES experts(id);
  ALTER TABLE whatsapp_rotacao_config ADD CONSTRAINT fk_whatsapp_rotacao_config_expert FOREIGN KEY (expert_id) REFERENCES experts(id);
  ALTER TABLE whatsapp_rotacao_mensagens ADD CONSTRAINT fk_whatsapp_rotacao_mensagens_expert FOREIGN KEY (expert_id) REFERENCES experts(id);
  ALTER TABLE whatsapp_eventos_log ADD CONSTRAINT fk_whatsapp_eventos_log_expert FOREIGN KEY (expert_id) REFERENCES experts(id);
  ALTER TABLE moderacao_grupos ADD CONSTRAINT fk_moderacao_grupos_expert FOREIGN KEY (expert_id) REFERENCES experts(id);
  ALTER TABLE moderacao_strikes ADD CONSTRAINT fk_moderacao_strikes_expert FOREIGN KEY (expert_id) REFERENCES experts(id);
  ALTER TABLE moderacao_log ADD CONSTRAINT fk_moderacao_log_expert FOREIGN KEY (expert_id) REFERENCES experts(id);
  ALTER TABLE agendamentos_mensagens ADD CONSTRAINT fk_agendamentos_mensagens_expert FOREIGN KEY (expert_id) REFERENCES experts(id);
  ALTER TABLE agendamentos_grupos ADD CONSTRAINT fk_agendamentos_grupos_expert FOREIGN KEY (expert_id) REFERENCES experts(id);
  ALTER TABLE torneios ADD CONSTRAINT fk_torneios_expert FOREIGN KEY (expert_id) REFERENCES experts(id);
  ALTER TABLE participantes ADD CONSTRAINT fk_participantes_expert FOREIGN KEY (expert_id) REFERENCES experts(id);
  ALTER TABLE greens ADD CONSTRAINT fk_greens_expert FOREIGN KEY (expert_id) REFERENCES experts(id);
  ALTER TABLE log_imagens ADD CONSTRAINT fk_log_imagens_expert FOREIGN KEY (expert_id) REFERENCES experts(id);
  ALTER TABLE copys_geradas ADD CONSTRAINT fk_copys_geradas_expert FOREIGN KEY (expert_id) REFERENCES experts(id);
  ALTER TABLE expert_perfil ADD CONSTRAINT fk_expert_perfil_expert FOREIGN KEY (expert_id) REFERENCES experts(id);
  ALTER TABLE blacklist_grupos ADD CONSTRAINT fk_blacklist_grupos_expert FOREIGN KEY (expert_id) REFERENCES experts(id);
  ALTER TABLE grupos_ignorar_coleta ADD CONSTRAINT fk_grupos_ignorar_coleta_expert FOREIGN KEY (expert_id) REFERENCES experts(id);
  ALTER TABLE telegram_canais ADD CONSTRAINT fk_telegram_canais_expert FOREIGN KEY (expert_id) REFERENCES experts(id);
  ALTER TABLE documents ADD CONSTRAINT fk_documents_expert FOREIGN KEY (expert_id) REFERENCES experts(id);
END $$;
