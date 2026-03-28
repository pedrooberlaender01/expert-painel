-- Migration: 05-02 Follow up expert RPC
-- Purpose: RPC for Follow up workflow to get leads needing followup for a specific expert
-- Used by: Follow up - assistente workflow (Ukax93riMgu0ZuKt) which is schedule-triggered
--          and must loop over all active experts independently

CREATE OR REPLACE FUNCTION buscar_leads_followup_expert(p_expert_id UUID)
RETURNS TABLE (
  lead_id UUID,
  telefone TEXT,
  nome TEXT,
  status TEXT,
  followup_enviado TIMESTAMPTZ,
  followup_convite_enviado TIMESTAMPTZ,
  followup_aguardando_cadastro TIMESTAMPTZ,
  followup_saiu_grupo TIMESTAMPTZ,
  followup_boas_vindas_grupo TIMESTAMPTZ,
  data_primeiro_contato TIMESTAMPTZ,
  ultima_interacao TIMESTAMPTZ,
  instancia_enviou TEXT,
  token_enviou TEXT,
  telefone_enviou TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT l.id, l.telefone, l.nome, l.status,
    l.followup_enviado, l.followup_convite_enviado,
    l.followup_aguardando_cadastro, l.followup_saiu_grupo,
    l.followup_boas_vindas_grupo, l.data_primeiro_contato,
    l.ultima_interacao, l.instancia_enviou, l.token_enviou, l.telefone_enviou
  FROM leads l
  WHERE l.expert_id = p_expert_id
  AND l.status IN ('primeiro_audio_enviado', 'convite_enviado', 'aguardando_cadastro', 'no_grupo', 'saiu_grupo')
  AND l.data_primeiro_contato IS NOT NULL;
END;
$$;
