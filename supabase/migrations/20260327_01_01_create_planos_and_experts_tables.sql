-- Migration: create_planos_and_experts_tables
-- Phase 1, Plan 01 -- Foundation tables for multi-tenant
-- Applied: 2026-03-27 via Supabase Management API

-- 1. Create planos table (must be first -- experts references it)
CREATE TABLE IF NOT EXISTS planos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome TEXT NOT NULL UNIQUE,
  max_leads INTEGER,
  max_instancias INTEGER NOT NULL DEFAULT 2,
  max_envios_mes INTEGER,
  features_permitidas JSONB NOT NULL DEFAULT '["agendamento"]'::jsonb,
  ativo BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2. Seed three plans (idempotent via ON CONFLICT)
INSERT INTO planos (nome, max_leads, max_instancias, max_envios_mes, features_permitidas)
VALUES
  ('Basico', 500, 2, 1000, '["agendamento"]'::jsonb),
  ('Pro', 2000, 5, 5000, '["agendamento", "torneio", "copy_ia"]'::jsonb),
  ('Enterprise', NULL, 10, NULL, '["agendamento", "torneio", "copy_ia", "moderacao", "voz_clonada"]'::jsonb)
ON CONFLICT (nome) DO NOTHING;

-- 3. Create experts table
CREATE TABLE IF NOT EXISTS experts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  cor_primaria TEXT NOT NULL DEFAULT '#10b981',
  cor_secundaria TEXT NOT NULL DEFAULT '#059669',
  logo_url TEXT,
  nome_plataforma TEXT NOT NULL DEFAULT 'Dashboard',
  nome_assistente TEXT NOT NULL DEFAULT 'Helena',
  voice_id TEXT,
  voice_settings JSONB DEFAULT '{"speed": 1.0, "pitch": 0, "timbre": 0, "vol": 1.0}'::jsonb,
  plano_id UUID REFERENCES planos(id),
  ativo BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 4. Seed Allan as Expert #1 with Enterprise plan
-- Uses subquery to get Enterprise plan ID dynamically
INSERT INTO experts (nome, slug, cor_primaria, cor_secundaria, nome_plataforma, nome_assistente, plano_id)
SELECT
  'Allan Cabral',
  'allan-cabral',
  '#10b981',
  '#059669',
  'AUTOMACOES',
  'Helena',
  p.id
FROM planos p
WHERE p.nome = 'Enterprise'
ON CONFLICT (slug) DO NOTHING;
