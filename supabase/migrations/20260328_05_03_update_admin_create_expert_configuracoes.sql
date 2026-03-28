-- Update admin_create_expert to auto-clone configuracoes from template expert
-- Per D-09: When admin creates a new expert, automatically duplicate Allan's
-- configuracoes rows as defaults. The template expert is the first expert by created_at.
-- All existing functionality is preserved; only the configuracoes duplication block is added.

CREATE OR REPLACE FUNCTION admin_create_expert(
  p_nome TEXT, p_slug TEXT, p_cor_primaria TEXT, p_cor_secundaria TEXT,
  p_logo_url TEXT, p_nome_plataforma TEXT, p_nome_assistente TEXT,
  p_voice_id TEXT, p_plano_id UUID, p_email TEXT, p_senha TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_expert_id UUID;
  v_senha_hash TEXT;
  v_template_expert_id UUID;
BEGIN
  -- Validate required fields
  IF p_nome IS NULL OR p_slug IS NULL OR p_email IS NULL OR p_senha IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Nome, slug, email e senha sao obrigatorios');
  END IF;

  -- Check email uniqueness (case-insensitive)
  IF EXISTS (SELECT 1 FROM admin_users WHERE lower(email) = lower(p_email)) THEN
    RETURN jsonb_build_object('success', false, 'error', 'Email ja esta em uso');
  END IF;

  -- Check slug uniqueness
  IF EXISTS (SELECT 1 FROM experts WHERE slug = p_slug) THEN
    RETURN jsonb_build_object('success', false, 'error', 'Slug ja esta em uso');
  END IF;

  -- Hash password
  v_senha_hash := crypt(p_senha, gen_salt('bf'));

  -- Create expert
  INSERT INTO experts (nome, slug, cor_primaria, cor_secundaria, logo_url, nome_plataforma, nome_assistente, voice_id, plano_id)
  VALUES (
    sanitize_text(p_nome), sanitize_text(p_slug), p_cor_primaria, p_cor_secundaria,
    p_logo_url, sanitize_text(COALESCE(p_nome_plataforma, p_nome)),
    sanitize_text(COALESCE(p_nome_assistente, 'Helena')),
    p_voice_id, p_plano_id
  )
  RETURNING id INTO v_expert_id;

  -- Create login credentials
  INSERT INTO admin_users (email, nome, senha_hash, role, expert_id, ativo)
  VALUES (lower(p_email), sanitize_text(p_nome), v_senha_hash, 'expert', v_expert_id, true);

  -- Clone configuracoes from template expert (Allan = first expert by created_at)
  SELECT id INTO v_template_expert_id FROM experts ORDER BY created_at ASC LIMIT 1;

  IF v_template_expert_id IS NOT NULL AND v_template_expert_id != v_expert_id THEN
    INSERT INTO configuracoes (expert_id, chave, valor, descricao)
    SELECT v_expert_id, chave, valor, descricao
    FROM configuracoes
    WHERE expert_id = v_template_expert_id;
  END IF;

  RETURN jsonb_build_object('success', true, 'expert_id', v_expert_id);
END;
$$;
