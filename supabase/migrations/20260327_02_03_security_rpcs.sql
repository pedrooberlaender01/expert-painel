-- =====================================================
-- Phase 02 Plan 03: Security RPCs
-- Input sanitization, validated CRUD, webhook validation,
-- token-free instance listing
-- =====================================================

-- 1. sanitize_text: Strip HTML tags, XSS vectors, enforce length
CREATE OR REPLACE FUNCTION sanitize_text(p_input TEXT, p_max_length INT DEFAULT 1000)
RETURNS TEXT AS $$
BEGIN
  IF p_input IS NULL THEN
    RETURN NULL;
  END IF;

  -- Strip HTML tags (basic XSS prevention)
  p_input := regexp_replace(p_input, '<[^>]*>', '', 'g');

  -- Remove common XSS vectors
  p_input := regexp_replace(p_input, 'javascript:', '', 'gi');
  p_input := regexp_replace(p_input, 'on\w+\s*=', '', 'gi');
  p_input := regexp_replace(p_input, 'data:(text|image|application)/[^;]*;base64', '[blocked]', 'gi');

  -- Trim whitespace
  p_input := TRIM(p_input);

  -- Enforce max length
  IF LENGTH(p_input) > p_max_length THEN
    p_input := LEFT(p_input, p_max_length);
  END IF;

  RETURN p_input;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- 2. insert_lead_validated: Validated lead insert with sanitization and expert_id enforcement
CREATE OR REPLACE FUNCTION insert_lead_validated(
  p_expert_id UUID,
  p_telefone TEXT,
  p_nome TEXT DEFAULT NULL,
  p_origem TEXT DEFAULT 'manual',
  p_status TEXT DEFAULT 'lead_chegou'
)
RETURNS UUID AS $$
DECLARE
  v_lead_id UUID;
  v_valid_statuses TEXT[] := ARRAY[
    'primeiro_audio_enviado', 'convite_enviado', 'interessado',
    'aguardando_cadastro', 'link_enviado', 'aguardando_confirmacao_entrada',
    'no_grupo', 'entrou_grupo', 'nao_interessado', 'sem_resposta',
    'atendimento_manual', 'lead_chegou'
  ];
BEGIN
  -- Validate expert exists and is active
  IF NOT EXISTS (SELECT 1 FROM experts WHERE id = p_expert_id AND ativo = true) THEN
    RAISE EXCEPTION 'Expert invalido ou inativo';
  END IF;

  -- Set RLS context
  PERFORM set_expert_context(p_expert_id);

  -- Validate phone (must be numeric, 10-15 digits)
  IF p_telefone IS NULL OR NOT p_telefone ~ '^\d{10,15}$' THEN
    RAISE EXCEPTION 'Telefone invalido: deve conter 10-15 digitos';
  END IF;

  -- Validate status
  IF NOT p_status = ANY(v_valid_statuses) THEN
    RAISE EXCEPTION 'Status invalido: %', p_status;
  END IF;

  -- Insert with sanitized inputs
  INSERT INTO leads (expert_id, telefone, nome, origem, status)
  VALUES (
    p_expert_id,
    sanitize_text(p_telefone, 15),
    sanitize_text(p_nome, 200),
    sanitize_text(p_origem, 50),
    p_status
  )
  RETURNING id INTO v_lead_id;

  RETURN v_lead_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. validate_webhook_expert: Validate that expert_id in webhook payload matches instance owner
CREATE OR REPLACE FUNCTION validate_webhook_expert(
  p_expert_id UUID,
  p_instancia TEXT
)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM whatsapp_rotacao
    WHERE expert_id = p_expert_id
    AND instancia = p_instancia
    AND ativo = true
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. update_lead_status_validated: Validated update for lead status
CREATE OR REPLACE FUNCTION update_lead_status_validated(
  p_expert_id UUID,
  p_lead_id UUID,
  p_status TEXT
)
RETURNS BOOLEAN AS $$
DECLARE
  v_valid_statuses TEXT[] := ARRAY[
    'primeiro_audio_enviado', 'convite_enviado', 'interessado',
    'aguardando_cadastro', 'link_enviado', 'aguardando_confirmacao_entrada',
    'no_grupo', 'entrou_grupo', 'nao_interessado', 'sem_resposta',
    'atendimento_manual', 'lead_chegou'
  ];
BEGIN
  -- Validate expert
  IF NOT EXISTS (SELECT 1 FROM experts WHERE id = p_expert_id AND ativo = true) THEN
    RAISE EXCEPTION 'Expert invalido ou inativo';
  END IF;

  -- Set RLS context
  PERFORM set_expert_context(p_expert_id);

  -- Validate status
  IF NOT p_status = ANY(v_valid_statuses) THEN
    RAISE EXCEPTION 'Status invalido: %', p_status;
  END IF;

  -- Update (RLS ensures expert can only update own leads)
  UPDATE leads
  SET status = p_status, updated_at = NOW()
  WHERE id = p_lead_id AND expert_id = p_expert_id;

  RETURN FOUND;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. get_expert_instances: Safe instance listing WITHOUT token column
CREATE OR REPLACE FUNCTION get_expert_instances(p_expert_id UUID)
RETURNS TABLE (
  id INT4,
  nome TEXT,
  numero TEXT,
  instancia TEXT,
  tipo TEXT,
  status_conexao TEXT,
  ativo BOOLEAN
) AS $$
BEGIN
  PERFORM set_expert_context(p_expert_id);

  RETURN QUERY
  SELECT wr.id, wr.nome, wr.numero, wr.instancia, wr.tipo, wr.status_conexao, wr.ativo
  FROM whatsapp_rotacao wr
  WHERE wr.expert_id = p_expert_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
