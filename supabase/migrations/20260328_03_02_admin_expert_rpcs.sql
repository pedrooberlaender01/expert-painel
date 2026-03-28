-- admin_list_experts: Returns expert list with joined plan name and aggregated counts
CREATE OR REPLACE FUNCTION admin_list_experts()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN (
    SELECT COALESCE(jsonb_agg(row_to_json(t)), '[]'::jsonb)
    FROM (
      SELECT
        e.id, e.nome, e.slug, e.cor_primaria, e.ativo,
        p.nome AS plano_nome,
        COALESCE((SELECT count(*) FROM leads l WHERE l.expert_id = e.id), 0)::int AS leads_count,
        COALESCE((SELECT count(*) FROM whatsapp_rotacao w WHERE w.expert_id = e.id), 0)::int AS instancias_count
      FROM experts e
      LEFT JOIN planos p ON e.plano_id = p.id
      ORDER BY e.created_at DESC
    ) t
  );
END;
$$;

-- admin_get_expert: Returns single expert with full data + instances (uses jsonb_build_object for instancias to avoid leaking tokens)
CREATE OR REPLACE FUNCTION admin_get_expert(p_expert_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result JSONB;
BEGIN
  SELECT jsonb_build_object(
    'expert', row_to_json(e),
    'planos', (SELECT COALESCE(jsonb_agg(row_to_json(p)), '[]'::jsonb) FROM planos p WHERE p.ativo = true),
    'instancias', COALESCE((SELECT jsonb_agg(jsonb_build_object(
      'id', w.id, 'nome', w.nome, 'numero', w.numero,
      'instancia', w.instancia, 'ativo', w.ativo
    )) FROM whatsapp_rotacao w WHERE w.expert_id = p_expert_id), '[]'::jsonb),
    'credentials', (SELECT jsonb_build_object('email', au.email) FROM admin_users au WHERE au.expert_id = p_expert_id AND au.role = 'expert' LIMIT 1)
  ) INTO result
  FROM experts e
  WHERE e.id = p_expert_id;

  RETURN result;
END;
$$;

-- admin_create_expert: Creates expert + admin_users login entry
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

  RETURN jsonb_build_object('success', true, 'expert_id', v_expert_id);
END;
$$;

-- admin_update_expert: Updates expert record
CREATE OR REPLACE FUNCTION admin_update_expert(
  p_expert_id UUID, p_nome TEXT, p_slug TEXT, p_cor_primaria TEXT,
  p_cor_secundaria TEXT, p_logo_url TEXT, p_nome_plataforma TEXT,
  p_nome_assistente TEXT, p_voice_id TEXT, p_plano_id UUID, p_ativo BOOLEAN
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE experts SET
    nome = sanitize_text(COALESCE(p_nome, nome)),
    slug = COALESCE(sanitize_text(p_slug), slug),
    cor_primaria = COALESCE(p_cor_primaria, cor_primaria),
    cor_secundaria = COALESCE(p_cor_secundaria, cor_secundaria),
    logo_url = p_logo_url,
    nome_plataforma = sanitize_text(COALESCE(p_nome_plataforma, nome_plataforma)),
    nome_assistente = sanitize_text(COALESCE(p_nome_assistente, nome_assistente)),
    voice_id = p_voice_id,
    plano_id = p_plano_id,
    ativo = COALESCE(p_ativo, ativo),
    updated_at = now()
  WHERE id = p_expert_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Expert nao encontrado');
  END IF;

  RETURN jsonb_build_object('success', true);
END;
$$;

-- admin_toggle_expert: Suspend/reactivate expert and login
CREATE OR REPLACE FUNCTION admin_toggle_expert(p_expert_id UUID, p_ativo BOOLEAN)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE experts SET ativo = p_ativo, updated_at = now() WHERE id = p_expert_id;
  UPDATE admin_users SET ativo = p_ativo WHERE expert_id = p_expert_id AND role = 'expert';
  RETURN jsonb_build_object('success', true);
END;
$$;
