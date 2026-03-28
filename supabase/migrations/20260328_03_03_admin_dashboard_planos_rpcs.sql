-- ============================================================
-- Phase 03 Plan 03: Admin Dashboard + Plan Management RPCs
-- ============================================================

-- admin_dashboard_metrics: Consolidated metrics for admin dashboard
CREATE OR REPLACE FUNCTION admin_dashboard_metrics()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_metrics JSONB;
  v_breakdown JSONB;
BEGIN
  -- Aggregate metrics
  SELECT jsonb_build_object(
    'total_leads', (SELECT count(*) FROM leads)::int,
    'envios_mes', COALESCE((
      SELECT count(*) FROM mensagens
      WHERE direcao = 'enviada'
      AND created_at >= date_trunc('month', now())
    ), 0)::int,
    'experts_ativos', (SELECT count(*) FROM experts WHERE ativo = true)::int,
    'experts_total', (SELECT count(*) FROM experts)::int,
    'instancias_conectadas', (SELECT count(*) FROM whatsapp_rotacao WHERE ativo = true)::int
  ) INTO v_metrics;

  -- Per-expert breakdown
  SELECT COALESCE(jsonb_agg(row_to_json(t)), '[]'::jsonb)
  INTO v_breakdown
  FROM (
    SELECT
      e.id AS expert_id,
      e.nome AS expert_nome,
      COALESCE((SELECT count(*) FROM leads l WHERE l.expert_id = e.id), 0)::int AS leads,
      COALESCE((
        SELECT count(*) FROM mensagens m
        WHERE m.direcao = 'enviada'
        AND m.expert_id = e.id
        AND m.created_at >= date_trunc('month', now())
      ), 0)::int AS envios,
      COALESCE((SELECT count(*) FROM whatsapp_rotacao w WHERE w.expert_id = e.id AND w.ativo = true), 0)::int AS instancias,
      COALESCE(p.nome, 'Sem plano') AS plano,
      e.ativo
    FROM experts e
    LEFT JOIN planos p ON e.plano_id = p.id
    ORDER BY leads DESC
  ) t;

  RETURN jsonb_build_object('metrics', v_metrics, 'breakdown', v_breakdown);
END;
$$;

-- admin_list_planos: List all plans
CREATE OR REPLACE FUNCTION admin_list_planos()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN (
    SELECT COALESCE(jsonb_agg(row_to_json(p) ORDER BY p.created_at), '[]'::jsonb)
    FROM planos p
  );
END;
$$;

-- admin_update_plano: Update plan fields
CREATE OR REPLACE FUNCTION admin_update_plano(
  p_plano_id UUID, p_nome TEXT, p_max_leads INT,
  p_max_instancias INT, p_max_envios_mes INT,
  p_features_permitidas TEXT[] DEFAULT NULL, p_ativo BOOLEAN DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE planos SET
    nome = COALESCE(sanitize_text(p_nome), nome),
    max_leads = p_max_leads,
    max_instancias = COALESCE(p_max_instancias, max_instancias),
    max_envios_mes = p_max_envios_mes,
    features_permitidas = COALESCE(p_features_permitidas, features_permitidas),
    ativo = COALESCE(p_ativo, ativo),
    updated_at = now()
  WHERE id = p_plano_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Plano nao encontrado');
  END IF;

  RETURN jsonb_build_object('success', true);
END;
$$;

-- admin_create_plano: Create a new plan
CREATE OR REPLACE FUNCTION admin_create_plano(
  p_nome TEXT, p_max_leads INT, p_max_instancias INT,
  p_max_envios_mes INT, p_features_permitidas TEXT[] DEFAULT ARRAY['agendamento']
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_plano_id UUID;
BEGIN
  INSERT INTO planos (nome, max_leads, max_instancias, max_envios_mes, features_permitidas)
  VALUES (sanitize_text(p_nome), p_max_leads, COALESCE(p_max_instancias, 2), p_max_envios_mes,
    COALESCE(p_features_permitidas, ARRAY['agendamento']::text[]))
  RETURNING id INTO v_plano_id;

  RETURN jsonb_build_object('success', true, 'plano_id', v_plano_id);
END;
$$;

-- Ensure default plans have correct values
UPDATE planos SET max_leads = 500, max_instancias = 2, max_envios_mes = 1000,
  features_permitidas = ARRAY['agendamento']
WHERE nome = 'Basico';

UPDATE planos SET max_leads = 2000, max_instancias = 5, max_envios_mes = 5000,
  features_permitidas = ARRAY['agendamento', 'torneio', 'copy_ia']
WHERE nome = 'Pro';

UPDATE planos SET max_leads = NULL, max_instancias = 10, max_envios_mes = NULL,
  features_permitidas = ARRAY['agendamento', 'torneio', 'copy_ia', 'moderacao', 'voz_clonada']
WHERE nome = 'Enterprise';
