-- ============================================================
-- Phase 02 Plan 01: Auth Roles Migration
-- Add role + expert_id to admin_users, update admin_login RPC,
-- create set_expert_context helper
-- ============================================================

-- 1. ALTER admin_users table (per D-04)
ALTER TABLE admin_users
  ADD COLUMN IF NOT EXISTS role TEXT NOT NULL DEFAULT 'expert',
  ADD COLUMN IF NOT EXISTS expert_id UUID REFERENCES experts(id);

-- Set Allan as agency admin
UPDATE admin_users SET role = 'admin', expert_id = NULL WHERE email = 'allan@admin.com';

-- Create test expert user for Allan
DO $$
DECLARE
  v_expert_id UUID;
  v_senha_hash TEXT;
BEGIN
  SELECT id INTO v_expert_id FROM experts WHERE slug = 'allan-cabral' LIMIT 1;
  SELECT senha_hash INTO v_senha_hash FROM admin_users WHERE email = 'allan@admin.com' LIMIT 1;

  INSERT INTO admin_users (email, nome, senha_hash, role, expert_id)
  VALUES ('allan@expert.com', 'Allan (Expert)', v_senha_hash, 'expert', v_expert_id)
  ON CONFLICT (email) DO UPDATE SET role = 'expert', expert_id = v_expert_id;
END $$;

-- 2. Create set_expert_context helper function (per D-01)
CREATE OR REPLACE FUNCTION set_expert_context(p_expert_id UUID)
RETURNS VOID AS $$
BEGIN
  PERFORM set_config('app.expert_id', p_expert_id::TEXT, true);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Replace admin_login RPC (per D-05)
CREATE OR REPLACE FUNCTION admin_login(p_email TEXT, p_senha TEXT)
RETURNS JSONB AS $$
DECLARE
  v_user RECORD;
  v_expert JSONB;
  v_result JSONB;
BEGIN
  -- Find user by email
  SELECT id, email, nome, senha_hash, role, expert_id
  INTO v_user
  FROM admin_users
  WHERE email = LOWER(TRIM(p_email))
    AND ativo = true;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Email ou senha incorretos');
  END IF;

  -- Verify password (using pgcrypto crypt)
  IF v_user.senha_hash != crypt(p_senha, v_user.senha_hash) THEN
    RETURN jsonb_build_object('success', false, 'error', 'Email ou senha incorretos');
  END IF;

  -- Build expert profile if user is an expert
  IF v_user.role = 'expert' AND v_user.expert_id IS NOT NULL THEN
    SELECT jsonb_build_object(
      'id', e.id,
      'nome', e.nome,
      'slug', e.slug,
      'cor_primaria', e.cor_primaria,
      'cor_secundaria', e.cor_secundaria,
      'logo_url', e.logo_url,
      'nome_plataforma', e.nome_plataforma,
      'nome_assistente', e.nome_assistente,
      'ativo', e.ativo,
      'plano', jsonb_build_object(
        'id', p.id,
        'nome', p.nome,
        'max_leads', p.max_leads,
        'max_instancias', p.max_instancias,
        'max_envios_mes', p.max_envios_mes,
        'features_permitidas', p.features_permitidas
      )
    ) INTO v_expert
    FROM experts e
    JOIN planos p ON p.id = e.plano_id
    WHERE e.id = v_user.expert_id AND e.ativo = true;

    IF v_expert IS NULL THEN
      RETURN jsonb_build_object('success', false, 'error', 'Expert inativo ou nao encontrado');
    END IF;

    -- Set expert context for RLS (per D-01)
    PERFORM set_expert_context(v_user.expert_id);
  END IF;

  -- Update last_login
  UPDATE admin_users SET last_login = now() WHERE id = v_user.id;

  -- Build result
  v_result := jsonb_build_object(
    'success', true,
    'user', jsonb_build_object(
      'id', v_user.id,
      'email', v_user.email,
      'nome', v_user.nome,
      'role', v_user.role,
      'expert_id', v_user.expert_id,
      'expert', COALESCE(v_expert, 'null'::jsonb)
    )
  );

  RETURN v_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. Example RPC pattern for expert-scoped queries (per D-01, D-02)
CREATE OR REPLACE FUNCTION get_leads_for_expert(p_expert_id UUID, p_limit INT DEFAULT 100, p_offset INT DEFAULT 0)
RETURNS SETOF leads AS $$
BEGIN
  -- Set context for RLS
  PERFORM set_expert_context(p_expert_id);

  RETURN QUERY
  SELECT * FROM leads
  WHERE expert_id = p_expert_id
  ORDER BY created_at DESC
  LIMIT p_limit OFFSET p_offset;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
